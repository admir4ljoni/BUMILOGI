package main

import (
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Root for uploaded files, from UPLOAD_DIR. Payment proofs live in private/
// and are only served through the API's owner/manager check.
var uploadDir string

const maxProofBytes = 5 << 20

// Keyed by http.DetectContentType's verdict on the bytes; the client's filename
// and Content-Type are never trusted. SVG is left out on purpose: it can carry script.
var proofTypes = map[string]string{"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf"}

// saveUpload sniffs the file, writes it as <uuid>.<ext> under dir and returns that name.
// ponytail: proof limits only; task 13 adds a size/type set for public images and PDFs.
func saveUpload(fh *multipart.FileHeader, dir string) (string, error) {
	if fh.Size > maxProofBytes {
		return "", fiber.NewError(fiber.StatusRequestEntityTooLarge, "Ukuran file maksimal 5 MB")
	}
	f, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, maxProofBytes+1))
	if err != nil {
		return "", err
	}
	ext, ok := proofTypes[http.DetectContentType(data)]
	if !ok {
		return "", fiber.NewError(fiber.StatusUnsupportedMediaType, "Format harus JPG, PNG, WEBP, atau PDF")
	}
	name := uuid.NewString() + "." + ext
	return name, os.WriteFile(filepath.Join(dir, name), data, 0o640)
}
