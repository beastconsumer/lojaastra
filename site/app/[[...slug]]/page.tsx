import Script from "next/script";

export default function LegacyPortalPage() {
  return (
    <>
      <div className="bg">
        <div className="noise" />
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>
      <div id="root" />
      <Script type="module" src="/legacy/app.js" strategy="afterInteractive" />
    </>
  );
}
