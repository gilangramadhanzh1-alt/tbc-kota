"""Backend API tests for Bank Data TBC Kota Sukabumi."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tb-sukabumi-kota.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "gilangramadhan.zh1@gmail.com"
ADMIN_PASSWORD = "Sukabumi2026!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Public endpoints ----------
class TestPublic:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200

    def test_indicators_12(self, session):
        r = session.get(f"{API}/indicators")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 12
        assert data[0]["id"] == "spm_terduga"

    def test_units_kelurahan_33(self, session):
        r = session.get(f"{API}/units", params={"type": "kelurahan"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 33
        assert all(u["type"] == "kelurahan" for u in data)
        # ensure no _id leaking
        assert all("_id" not in u for u in data)

    def test_units_faskes_25(self, session):
        r = session.get(f"{API}/units", params={"type": "faskes"})
        assert r.status_code == 200
        assert len(r.json()) >= 25

    def test_summary(self, session):
        r = session.get(f"{API}/summary", params={"year": 2025, "unit_type": "faskes", "period_type": "tahunan", "period_index": 1})
        assert r.status_code == 200
        assert len(r.json()) == 12

    def test_report_tahunan(self, session):
        r = session.get(f"{API}/report", params={"indicator": "spm_terduga", "year": 2025, "unit_type": "kelurahan", "period_type": "tahunan", "period_index": 1})
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d and "total" in d
        assert d["indicator"]["id"] == "spm_terduga"

    def test_report_invalid_indicator(self, session):
        r = session.get(f"{API}/report", params={"indicator": "bogus", "year": 2025})
        assert r.status_code == 404

    def test_trend(self, session):
        r = session.get(f"{API}/trend", params={"indicator": "spm_terduga", "year": 2025, "unit_type": "kelurahan"})
        assert r.status_code == 200
        d = r.json()
        assert len(d) == 12
        assert d[0]["month"] == 1


# ---------- Auth endpoints ----------
class TestAuth:
    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass123"})
        assert r.status_code == 401

    def test_me_requires_auth(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_admin_endpoints_require_auth(self):
        # Each admin-only endpoint should 401 without token
        r1 = requests.get(f"{API}/input", params={"indicator": "spm_terduga", "year": 2025, "unit_type": "kelurahan"})
        assert r1.status_code == 401
        r2 = requests.put(f"{API}/input", json={"indicator": "spm_terduga", "year": 2025, "rows": []})
        assert r2.status_code == 401
        r3 = requests.post(f"{API}/units", json={"name": "X", "type": "kelurahan"})
        assert r3.status_code == 401
        r4 = requests.put(f"{API}/units/000000000000000000000000", json={"name": "X", "type": "kelurahan"})
        assert r4.status_code == 401
        r5 = requests.delete(f"{API}/units/000000000000000000000000")
        assert r5.status_code == 401


# ---------- Units CRUD ----------
class TestUnitsCRUD:
    created_id = None

    def test_create_test_unit(self, auth_headers):
        name = "TEST_KELURAHAN_PYTEST"
        r = requests.post(f"{API}/units", json={"name": name, "type": "kelurahan", "order": 999}, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == name
        assert d["type"] == "kelurahan"
        assert d.get("id")
        TestUnitsCRUD.created_id = d["id"]

    def test_duplicate_name_fails(self, auth_headers):
        r = requests.post(f"{API}/units", json={"name": "TEST_KELURAHAN_PYTEST", "type": "kelurahan"}, headers=auth_headers)
        assert r.status_code == 400

    def test_update_unit(self, auth_headers):
        uid = TestUnitsCRUD.created_id
        assert uid
        r = requests.put(f"{API}/units/{uid}", json={"name": "TEST_KELURAHAN_RENAMED", "type": "kelurahan", "order": 998}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_KELURAHAN_RENAMED"

    def test_delete_unit(self, auth_headers):
        uid = TestUnitsCRUD.created_id
        r = requests.delete(f"{API}/units/{uid}", headers=auth_headers)
        assert r.status_code == 200
        # verify
        all_u = requests.get(f"{API}/units", params={"type": "kelurahan"}).json()
        assert not any(u["id"] == uid for u in all_u)


# ---------- Input + aggregation math ----------
class TestInputAggregation:
    """Target angka 120, monthly capaian 10 each => triwulan tgt 30 cap 30 persen 100.0,
       semester tgt 60 cap 60, tahunan tgt 120 cap 120"""
    saved_unit_id = None
    original = None
    INDICATOR = "spm_terduga"
    YEAR = 2099  # isolated test year

    def test_save_and_persist(self, auth_headers):
        units = requests.get(f"{API}/units", params={"type": "kelurahan"}).json()
        assert units
        uid = units[0]["id"]
        TestInputAggregation.saved_unit_id = uid

        # back up original
        g = requests.get(f"{API}/input", params={"indicator": self.INDICATOR, "year": self.YEAR, "unit_type": "kelurahan"}, headers=auth_headers)
        assert g.status_code == 200
        TestInputAggregation.original = next((row for row in g.json() if row["unit_id"] == uid), None)

        payload = {
            "indicator": self.INDICATOR, "year": self.YEAR,
            "rows": [{"unit_id": uid, "target_angka": 120, "target_persen": 100,
                      "months": [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]}]
        }
        r = requests.put(f"{API}/input", json=payload, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["saved"] == 1

        # verify get returns saved
        g2 = requests.get(f"{API}/input", params={"indicator": self.INDICATOR, "year": self.YEAR, "unit_type": "kelurahan"}, headers=auth_headers).json()
        row = next(r for r in g2 if r["unit_id"] == uid)
        assert row["target_angka"] == 120
        assert row["months"] == [10] * 12

    def test_triwulan_math(self, auth_headers):
        uid = TestInputAggregation.saved_unit_id
        r = requests.get(f"{API}/report", params={"indicator": self.INDICATOR, "year": self.YEAR, "unit_type": "kelurahan", "period_type": "triwulan", "period_index": 1})
        assert r.status_code == 200
        row = next(x for x in r.json()["rows"] if x["unit_id"] == uid)
        assert row["target_angka"] == 30.0
        assert row["capaian_angka"] == 30.0
        assert row["capaian_persen"] == 100.0

    def test_semester_math(self):
        uid = TestInputAggregation.saved_unit_id
        r = requests.get(f"{API}/report", params={"indicator": self.INDICATOR, "year": self.YEAR, "unit_type": "kelurahan", "period_type": "semester", "period_index": 1})
        row = next(x for x in r.json()["rows"] if x["unit_id"] == uid)
        assert row["target_angka"] == 60.0
        assert row["capaian_angka"] == 60.0

    def test_tahunan_math(self):
        uid = TestInputAggregation.saved_unit_id
        r = requests.get(f"{API}/report", params={"indicator": self.INDICATOR, "year": self.YEAR, "unit_type": "kelurahan", "period_type": "tahunan", "period_index": 1})
        row = next(x for x in r.json()["rows"] if x["unit_id"] == uid)
        assert row["target_angka"] == 120.0
        assert row["capaian_angka"] == 120.0
        assert row["capaian_persen"] == 100.0

    def test_bulan_math(self):
        uid = TestInputAggregation.saved_unit_id
        r = requests.get(f"{API}/report", params={"indicator": self.INDICATOR, "year": self.YEAR, "unit_type": "kelurahan", "period_type": "bulan", "period_index": 3})
        row = next(x for x in r.json()["rows"] if x["unit_id"] == uid)
        assert row["target_angka"] == 10.0
        assert row["capaian_angka"] == 10.0

    def test_cleanup_reset_to_zero(self, auth_headers):
        """Reset values to 0 to keep DB clean."""
        uid = TestInputAggregation.saved_unit_id
        payload = {
            "indicator": self.INDICATOR, "year": self.YEAR,
            "rows": [{"unit_id": uid, "target_angka": 0, "target_persen": 100, "months": [0] * 12}]
        }
        r = requests.put(f"{API}/input", json=payload, headers=auth_headers)
        assert r.status_code == 200


# ---------- Validation ----------
class TestValidation:
    def test_negative_capaian_rejected(self, auth_headers):
        units = requests.get(f"{API}/units", params={"type": "kelurahan"}).json()
        uid = units[0]["id"]
        payload = {"indicator": "spm_terduga", "year": 2099,
                   "rows": [{"unit_id": uid, "target_angka": 100, "target_persen": 100, "months": [-1] + [0]*11}]}
        r = requests.put(f"{API}/input", json=payload, headers=auth_headers)
        assert r.status_code in (400, 422)

    def test_bad_month_index(self, session):
        r = session.get(f"{API}/report", params={"indicator": "spm_terduga", "year": 2025, "period_type": "bulan", "period_index": 13})
        assert r.status_code == 400



# ---------- NEW: Indicator filtering by unit_type ----------
class TestIndicatorFiltering:
    """Kelurahan basis only has 2 indicators; faskes has 12."""

    def test_indicators_kelurahan_only_2(self, session):
        r = session.get(f"{API}/indicators", params={"unit_type": "kelurahan"})
        assert r.status_code == 200
        data = r.json()
        ids = {i["id"] for i in data}
        assert ids == {"treatment_coverage", "penemuan_kasus_tb_ro"}, f"got {ids}"

    def test_indicators_faskes_12(self, session):
        r = session.get(f"{API}/indicators", params={"unit_type": "faskes"})
        assert r.status_code == 200
        assert len(r.json()) == 12

    def test_summary_kelurahan_only_2(self, session):
        r = session.get(f"{API}/summary", params={"year": 2026, "unit_type": "kelurahan"})
        assert r.status_code == 200
        data = r.json()
        ids = {i["id"] for i in data}
        assert ids == {"treatment_coverage", "penemuan_kasus_tb_ro"}, f"got {ids}"

    def test_summary_faskes_12(self, session):
        r = session.get(f"{API}/summary", params={"year": 2026, "unit_type": "faskes"})
        assert r.status_code == 200
        assert len(r.json()) == 12


# ---------- NEW: Documents endpoints ----------
class TestDocuments:
    """Supporting documents upload/download/delete flow."""

    IND = "treatment_coverage"
    YEAR = 2099  # isolated

    def test_upload_requires_admin(self, session):
        files = {"file": ("test.csv", b"a,b\n1,2", "text/csv")}
        data = {"indicator": self.IND, "year": self.YEAR, "keterangan": "TEST"}
        r = requests.post(f"{API}/documents", data=data, files=files)
        assert r.status_code == 401, f"expected 401 got {r.status_code}"

    def test_upload_rejects_txt(self, auth_headers):
        hdr = {"Authorization": auth_headers["Authorization"]}
        files = {"file": ("bad.txt", b"nope", "text/plain")}
        data = {"indicator": self.IND, "year": self.YEAR, "keterangan": "TEST"}
        r = requests.post(f"{API}/documents", data=data, files=files, headers=hdr)
        assert r.status_code == 400

    def test_upload_rejects_png(self, auth_headers):
        hdr = {"Authorization": auth_headers["Authorization"]}
        files = {"file": ("bad.png", b"\x89PNG\r\n", "image/png")}
        data = {"indicator": self.IND, "year": self.YEAR, "keterangan": "TEST"}
        r = requests.post(f"{API}/documents", data=data, files=files, headers=hdr)
        assert r.status_code == 400

    def test_full_flow_csv(self, auth_headers):
        hdr = {"Authorization": auth_headers["Authorization"]}
        content = b"col1,col2\nTEST_a,TEST_b\n"
        files = {"file": ("TEST_doc.csv", content, "text/csv")}
        data = {"indicator": self.IND, "year": self.YEAR, "keterangan": "TEST_pytest"}
        # Upload
        up = requests.post(f"{API}/documents", data=data, files=files, headers=hdr)
        assert up.status_code == 200, f"upload failed: {up.status_code} {up.text}"
        d = up.json()
        doc_id = d["id"]
        assert d["filename"] == "TEST_doc.csv"
        assert d["size"] == len(content)
        assert d["content_type"] == "text/csv"

        # Listed publicly
        lst = requests.get(f"{API}/documents", params={"indicator": self.IND, "year": self.YEAR})
        assert lst.status_code == 200
        assert any(x["id"] == doc_id for x in lst.json())

        # Download public
        dl = requests.get(f"{API}/documents/{doc_id}/download")
        assert dl.status_code == 200
        assert dl.content == content
        cd = dl.headers.get("Content-Disposition", "")
        assert "attachment" in cd and "TEST_doc.csv" in cd

        # Non-admin delete rejected
        del_noauth = requests.delete(f"{API}/documents/{doc_id}")
        assert del_noauth.status_code == 401

        # Admin delete
        d2 = requests.delete(f"{API}/documents/{doc_id}", headers=hdr)
        assert d2.status_code == 200

        # Gone from list
        lst2 = requests.get(f"{API}/documents", params={"indicator": self.IND, "year": self.YEAR})
        assert not any(x["id"] == doc_id for x in lst2.json())

        # Download of deleted -> 404
        dl2 = requests.get(f"{API}/documents/{doc_id}/download")
        assert dl2.status_code == 404

        # Delete again -> 404
        d3 = requests.delete(f"{API}/documents/{doc_id}", headers=hdr)
        assert d3.status_code == 404

    def test_upload_pdf_ok(self, auth_headers):
        hdr = {"Authorization": auth_headers["Authorization"]}
        content = b"%PDF-1.4\n%TEST\n"
        files = {"file": ("TEST_doc.pdf", content, "application/pdf")}
        data = {"indicator": self.IND, "year": self.YEAR, "keterangan": "TEST_pdf"}
        up = requests.post(f"{API}/documents", data=data, files=files, headers=hdr)
        assert up.status_code == 200
        doc_id = up.json()["id"]
        # Cleanup
        requests.delete(f"{API}/documents/{doc_id}", headers=hdr)
