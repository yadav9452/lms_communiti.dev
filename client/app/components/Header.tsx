"use-client";
import Link from "next/link";
import React, { FC, useState } from "react";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeItem: number;
};

const Header: FC<Props> = (props: Props) => {
  const [active, setActive] = useState(false);
  const [openSidebar, setOpenSidebar] = useState(0);

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 80) {
        setActive(true);
      } else {
        setActive(false);
      }
    });
  }
  return (
    <div className="w-full relative">
      <div
        className={`${
          active
            ? "dark:bg-opacity-50 dark:bg-gradient-to-b dark:from-gray-900 dark:to-black fixed top-0 w-full h-[80px] z-[80] border-b dark:border-[#ffffff1c] shadow-xl transition duartion-500 "
            : "w-full border-b dark:border-[#ffffff1c] h-[80px]z-[80] dark:shadow"
        }`}
      >
        <div className="w-[95%] 800px:w-[92%] m-auto py-2 h-full ">
          <div className="w-full h-[80px] flex itmes-center justify-between p-3">
            <Link href={"/"} className={`text-[25px]`}></Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
