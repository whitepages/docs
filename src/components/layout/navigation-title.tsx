import Image from "next/image";

export function NavigationTitle() {
  return (
    <div className="flex h-8">
      <Image
        src="/whitepages_gray_icon.svg"
        alt="Whitepages"
        width={150}
        height={32}
        className="block dark:hidden h-full w-auto"
        priority
      />
      <Image
        src="/whitepages_white_icon.svg"
        alt="Whitepages"
        width={150}
        height={32}
        className="hidden dark:block h-full w-auto"
        priority
      />
    </div>
  );
}
