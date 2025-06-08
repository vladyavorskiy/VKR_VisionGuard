import React from "react";
import { Link, useLocation } from "react-router-dom";
import { SearchIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export const Header = (): JSX.Element => {
  const location = useLocation();
  const navItems = [
    { name: "Главная", path: "/", width: "w-20" },
    { name: "Камеры", path: "/cameras", width: "w-[68px]" },
    { name: "Профиль", path: "/profile", width: "w-20" },
    { name: "Отчеты", path: "/reports", width: "w-[67px]" },
  ];

  const isOnCamerasPage = location.pathname === '/cameras';

  return (
    <header className="w-full h-[65px] border-b [border-bottom-style:solid] border-[#f0f2f5] flex items-center">
      <div className="flex items-center ml-10">
        <img
          className="w-4 h-4"
          alt="Logo"
          src="https://c.animaapp.com/mb9kw0qudYRMkO/img/svg-2.svg"
        />
        <div className="ml-4 [font-family:'Space_Grotesk',Helvetica] font-bold text-[#111518] text-lg tracking-[-0.27px] leading-[22.5px]">
          VisionGuard
        </div>
      </div>

      <nav className="flex ml-8">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`${item.width} h-[21px] mx-5 [font-family:'Roboto_Mono',Helvetica] font-bold text-[#111518] text-base text-center tracking-[0] leading-[21px] ${
              location.pathname === item.path ? "text-[#2094f3]" : ""
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    
      <div className="flex items-center ml-auto mr-10">
        {!isOnCamerasPage && (
          <>
            <div className="flex h-10 rounded-xl overflow-hidden mr-8">
              <div className="w-10 h-10 bg-[#f0f2f5] rounded-[12px_0px_0px_12px] flex items-center justify-center">
                <SearchIcon className="w-6 h-6" />
              </div>
              <Input
                className="w-[215px] h-10 bg-[#f0f2f5] rounded-[0px_12px_12px_0px] border-none [font-family:'Space_Grotesk',Helvetica] text-[#60778a]"
                placeholder="Поиск"
              />
            </div>

            <Link to="/cameras">
              <Button className="w-[111px] h-10 bg-[#2094f3] rounded-xl mr-8">
                <span className="[font-family:'Space_Grotesk',Helvetica] font-bold text-white text-sm text-center tracking-[0.21px] leading-[21px]">
                  Добавить
                </span>
              </Button>
            </Link>
          </>
        )}
        
        <Button
          variant="outline"
          className="w-10 h-10 bg-[#f0f2f5] rounded-xl p-0 mr-2 border-none"
        >
          <img
            className="w-5 h-5"
            alt="Notification"
            src="https://c.animaapp.com/mb9kw0qudYRMkO/img/svg.svg"
          />
        </Button>

        <Button
          variant="outline"
          className="w-10 h-10 bg-[#f0f2f5] rounded-xl p-0 mr-8 border-none"
        >
          <img
            className="w-5 h-5"
            alt="Settings"
            src="https://c.animaapp.com/mb9kw0qudYRMkO/img/svg-1.svg"
          />
        </Button>

        <img
          className="w-10 h-10 object-cover rounded-full"
          alt="User"
          src="https://c.animaapp.com/mb9kw0qudYRMkO/img/image.png"
        />
      </div>
    </header>
  );
};