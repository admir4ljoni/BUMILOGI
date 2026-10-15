package main

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

// sendMail is a var so tests can capture outgoing mail.
var sendMail = func(to, subject, body string) {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		// ponytail: dev fallback, mail goes to the log. Set SMTP_* (Brevo/Resend) before slice 15.
		log.Printf("MAIL to=%s subject=%q\n%s", to, subject, body)
		return
	}
	from := os.Getenv("MAIL_FROM")
	msg := "From: BUMILOGI <" + from + ">\r\nTo: " + to + "\r\nSubject: " + subject +
		"\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" +
		strings.ReplaceAll(body, "\n", "\r\n")
	auth := smtp.PlainAuth("", os.Getenv("SMTP_USER"), os.Getenv("SMTP_PASS"), host)
	addr := fmt.Sprintf("%s:%s", host, os.Getenv("SMTP_PORT")) // 587, STARTTLS is negotiated by smtp.SendMail
	if err := smtp.SendMail(addr, auth, from, []string{to}, []byte(msg)); err != nil {
		log.Printf("mail to %s failed: %v", to, err)
	}
}
