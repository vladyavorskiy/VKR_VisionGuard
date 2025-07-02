import { Link, useLocation } from "react-router-dom";
import { XIcon, MailIcon, SendIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import api from "../api";

export const Header = (): JSX.Element => {
  const location = useLocation();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { name: "Главная", path: "/home", width: "w-20" },
    { name: "Камеры", path: "/cameras", width: "w-[68px]" },
  ];

  type User = {
    email: string;
    name: string;
    gender: string;
    avatar?: string;
  };

  const isOnCamerasPage = location.pathname === "/cameras";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userResponse = await api.get("/me");
        setUser(userResponse.data);

        if (!document.cookie.includes("csrf_token=")) {
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

    checkAuth();
  }, [location.pathname]);

  // const logout = async () => {
  //   try {
  //     await api.get("/logout");
  //     setUser(null);
  //     setIsModalOpen(false);
  //     window.location.reload();
  //   } catch (error) {
  //     console.error("Logout failed:", error);
  //   }
  // };


  const logout = async () => {
  try {
    // 1. Отправляем запрос на бэкенд для очистки сессии
    await api.get("/logout", { withCredentials: true });

    // 2. Очищаем локальное состояние
    setUser(null);
    setIsModalOpen(false);

    // 3. Очищаем все возможные хранилища
    localStorage.clear();
    sessionStorage.clear();

    // 4. Очищаем куки фронтенда
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });

    // 5. Перенаправляем на Яндекс для полного выхода
    window.location.href = 'https://passport.yandex.ru/passport?mode=logout&retpath=' + 
      encodeURIComponent(window.location.origin);
    
  } catch (error) {
    console.error("Logout failed:", error);
    // Fallback: принудительная перезагрузка даже при ошибке
    window.location.href = '/';
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
            className={`${
              item.width
            } h-[21px] mx-5 [font-family:'Roboto_Mono',Helvetica] font-bold text-[#111518] text-base text-center tracking-[0] leading-[21px] ${
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
          onClick={() => setIsHelpModalOpen(true)}
        >
          <img
            className="w-5 h-5"
            alt="Help"
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
            className="flex items-center justify-center p-2 rounded-xl hover:opacity-80 transition-opacity"
          >
            <img
              src="/ya_favicon.svg"
              alt="Войти через Яндекс"
              className="h-10 w-10"
            />
          </a>
        )}
      </div>

      {isModalOpen && user && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white p-8 rounded-xl w-full max-w-md" // Увеличил размеры и padding
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Профиль пользователя
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-start mb-6">
              <img
                className="w-24 h-24 rounded-full object-cover mr-8 border-2 border-gray-200" // Увеличил аватар до 96x96px
                src={
                  user.avatar
                    ? user.avatar
                    : "https://c.animaapp.com/mb9kw0qudYRMkO/img/image.png"
                }
                alt="User Avatar"
              />
              <div className="space-y-3">
                <div className="flex items-center">
                  <p className="text-lg text-gray-800">
                    <span className="font-semibold">Имя:</span> {user.name}
                  </p>
                </div>
                <div className="flex items-center">
                  <p className="text-lg text-gray-800">
                    <span className="font-semibold">Email:</span> {user.email}
                  </p>
                </div>
                <div className="flex items-center">
                  <p className="text-lg text-gray-800">
                    <span className="font-semibold">Пол:</span>{" "}
                    {user.gender === "male" ? "Мужской" : "Женский"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={logout}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {isHelpModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setIsHelpModalOpen(false)}
        >
          <div
            className="bg-white p-8 rounded-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Нужна помощь?
              </h2>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <p className="text-lg text-gray-600 mb-6">
              Если у вас возникли проблемы с сервисом, свяжитесь со мной:
            </p>

            <div className="space-y-4">
              <div className="flex items-center">
                <MailIcon className="w-6 h-6 text-gray-500 mr-3" />
                <a
                  href="mailto:yavorskij_vi@edu.surgu.ru"
                  className="text-lg text-blue-600 hover:underline"
                >
                  yavorskij_vi@edu.surgu.ru
                </a>
              </div>

              <div className="flex items-center">
                <SendIcon className="w-6 h-6 text-gray-500 mr-3" />
                <a
                  href="https://t.me/nethellone"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg text-blue-600 hover:underline"
                >
                  @nethellone
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
