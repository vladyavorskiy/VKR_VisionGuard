import { Link, useLocation } from "react-router-dom";
import { SearchIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import React, { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom"; // Добавьте этот импорт

export const Header = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = [
    { name: "Главная", path: "/", width: "w-20" },
    { name: "Камеры", path: "/cameras", width: "w-[68px]" },
    { name: "Профиль", path: "/profile", width: "w-20" },
    { name: "Отчеты", path: "/reports", width: "w-[67px]" },
  ];

  type User = {
    email: string;
    name: string;
    gender: string;
    avatar?: string;
  };

  const isOnCamerasPage = location.pathname === '/cameras';

  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Проверяем, есть ли пользователь
        const userResponse = await api.get("/me");
        setUser(userResponse.data);
        
        // Убеждаемся, что CSRF-токен есть
        if (!document.cookie.includes('csrf_token=')) {
          try {
            await api.get("/csrf-token");
          } catch (error) {
            console.error("Failed to get CSRF token:", error);
          }
        }
      } catch (error) {
        setUser(null);
      }
    };
  
    // Проверяем авторизацию при загрузке
    checkAuth();
  }, [location.pathname]);


  const logout = async () => {
    try {
      await api.get("/logout");
      setUser(null);
      setIsModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

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

        {/* <img
          className="w-10 h-10 object-cover rounded-full"
          alt="User"
          src="https://c.animaapp.com/mb9kw0qudYRMkO/img/image.png"
        /> */}

        {user ? (
          <img
            onClick={toggleModal}
            className="w-10 h-10 object-cover rounded-full cursor-pointer"
            alt="User"
            src={
              user.avatar
                ? user.avatar
                : "https://c.animaapp.com/mb9kw0qudYRMkO/img/image.png"
            }
          />
        ) : (
          <a
            href="http://localhost:5000/login/yandex"
            className="bg-[#2094f3] text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            Войти через Яндекс
          </a>
        )}
      </div>

      {isModalOpen && user && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
        onClick={() => setIsModalOpen(false)}
      >
        <div
          className="bg-white p-6 rounded-lg max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">Профиль пользователя</h2>
          <div className="flex items-center mb-4">
            <img
              className="w-16 h-16 rounded-full object-cover mr-4"
              src={user.avatar ? user.avatar : "https://c.animaapp.com/mb9kw0qudYRMkO/img/image.png"}
              alt="User Avatar"
            />
            <div>
              <p><b>Имя:</b> {user.name}</p>
              <p><b>Email:</b> {user.email}</p>
              <p><b>Пол:</b> {user.gender}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Выйти
          </button>
        </div>
      </div>
    )}
    
    </header>

          
  );
};