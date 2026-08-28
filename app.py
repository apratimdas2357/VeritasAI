"""
Veritas — minimal Flask scaffold wiring up the screen templates.

Run:
    pip install flask --break-system-packages
    python app.py
Then open http://localhost:8000 (use HTTPS/ngrok or deploy for real
camera access on a phone — getUserMedia requires a secure context).

Wire /api/scan/capture, /api/scan/face, and the document/results data
below into your actual OCR + tampering + face-verification pipeline.
"""

from flask import Flask, render_template, jsonify, request
from pipeline import process_document

app = Flask(__name__)


@app.route("/")
@app.route("/home")
def home():
    return render_template("home.html", shots_taken=1, shots_required=4)


@app.route("/documents")
def documents():
    # Replace with the real per-session results from your OCR/validation pipeline.
    sample_documents = [
        {"name": "Passport", "status": "verified"},
        {"name": "Visa", "status": "not_verified"},
        {"name": "National ID", "status": "verified"},
        {"name": "Driving License", "status": "verified"},
        {"name": "Permit", "status": "verified"},
    ]
    return render_template("documents.html", documents=sample_documents)


@app.route("/face-scan")
def face_scan():
    return render_template("face_scan.html")


@app.route("/results")
def results():
    sample_findings = [
        "Documents match the person.",
        "No impersonation detected.",
        "No fake documents detected.",
        "Checksum passed.",
    ]
    return render_template("results.html", score=94, findings=sample_findings)


@app.route("/history")
def history():
    return render_template("history.html")


@app.route("/api/scan/capture", methods=["POST"])
def api_scan_capture():
    """Receives one captured/uploaded document frame. Hook OCR here."""
    image = request.files.get("image")
    sequence = request.form.get("sequence")

    if not image:
        return jsonify({"ok": False, "error": "No image provided"}), 400

    try:
        # Step 1: Capture (Frontend -> Flask) received the image
        image_bytes = image.read()
        confidence_score, findings, merged_data = process_document(image_bytes)

        return jsonify({
            "ok": True,
            "sequence": sequence,
            "status": "processing_complete",
            "confidence_score": confidence_score,
            "findings": findings,
            "data": merged_data
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860, debug=False)
