import Image from "next/image";

export function HeaderMark() {
  return (
    <>
      <span className="relative flex h-[53px] w-[73px] shrink-0 items-center justify-center overflow-hidden dark:hidden">
        <Image
          src="/logo-icon-light.png"
          alt=""
          fill
          priority
          sizes="73px"
          className="object-contain"
        />
      </span>
      <span className="relative hidden h-[53px] w-[73px] shrink-0 items-center justify-center overflow-hidden dark:flex">
        <Image
          src="/logo-icon-dark.png"
          alt=""
          fill
          priority
          sizes="73px"
          className="object-contain"
        />
      </span>
    </>
  );
}
