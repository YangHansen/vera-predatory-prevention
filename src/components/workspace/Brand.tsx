import Image from "next/image";

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`vera-brand ${small ? "small" : ""}`}>
      <Image
        src="/vera-logo-horizontal.png"
        alt="Vera AI — Real-Time Insurance Compliance & Consumer Protection System"
        width={2103}
        height={748}
        className="vera-brand-logo"
        priority
        sizes={small ? "170px" : "190px"}
      />
    </span>
  );
}
