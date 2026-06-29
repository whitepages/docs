import Image from "next/image";

export function NavigationTitle() {
  return (
    <div className="flex h-8">
      <Image
        src="/docs/pro_api_logo.svg"
        alt="Whitepages Pro API"
        width={172}
        height={32}
        className="block h-full w-auto"
        priority
      />
    </div>
  );
}
