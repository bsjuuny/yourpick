"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function DonationPopup() {
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        setMounted(true);
        const hasClosed = sessionStorage.getItem("donationPopupClosed");
        if (!hasClosed) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                setTimeout(() => setShow(true), 50);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    if (!mounted || !isVisible) return null;

    return createPortal(
        <div
            style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "24px",
                backgroundColor: "#ffffff",
                border: "1px solid #f1f5f9",
                borderRadius: "24px",
                width: "300px",
                boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.15)",
                color: "#1e293b",
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: show ? "translateY(0) scale(1)" : "translateY(40px) scale(0.95)",
                opacity: show ? 1 : 0,
            }}
        >
            <button
                onClick={() => {
                    sessionStorage.setItem("donationPopupClosed", "true");
                    setShow(false);
                    setTimeout(() => setIsVisible(false), 600);
                }}
                style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    padding: "8px",
                    color: "#94a3b8",
                    backgroundColor: "#f8fafc",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                }}
                aria-label="닫기"
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
            >
                <X size={18} />
            </button>

            <div style={{
                width: "100%",
                marginBottom: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "20px",
                display: "flex",
                justifyContent: "center",
                padding: "16px",
                border: "1px dashed #e2e8f0"
            }}>
                <img
                    src="/yourpick/donation-qr.png"
                    alt="기부 QR 코드"
                    style={{ width: "160px", height: "160px", objectFit: "contain", borderRadius: "8px" }}
                />
            </div>

            <div style={{ textAlign: "center", width: "100%" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 800, color: "#4f46e5" }}>
                    따뜻한 응원을 보내주세요! ☕
                </h4>
                <p style={{ fontSize: "13px", fontWeight: 500, lineHeight: 1.6, wordBreak: "keep-all", margin: "0", color: "#64748b" }}>
                    아이마일스톤이 도움이 되셨나요?<br />
                    커피 한 잔의 소중한 후원은<br />
                    더 밝은 내일을 위한 큰 힘이 됩니다.
                </p>
            </div>
        </div>,
        document.body
    );
}
