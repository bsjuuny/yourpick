export default function DonationPopup() {
    return (
        <details className="mt-4 text-sm text-slate-600">
            <summary className="cursor-pointer font-bold text-indigo-600">유어픽 응원하기 ☕</summary>
            <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- Static QR code on Cafe24. */}
                <img
                    src="/yourpick/donation-qr.png"
                    alt="후원용 네이버페이 QR 코드"
                    width={160}
                    height={160}
                    className="max-w-full rounded-lg"
                />
                <p className="text-xs leading-relaxed">
                    유어픽이 도움이 되셨나요?<br />
                    커피 한 잔의 응원이 서비스 운영에 힘이 됩니다.
                </p>
            </div>
        </details>
    );
}
