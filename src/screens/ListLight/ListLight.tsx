import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { SearchIcon, MoreVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { CameraCreate } from "../CameraCreate";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";
import { CameraEdit } from "../CameraEdit";

interface Camera {
  id: string;
  name: string;
  image: string;
  addedAt: Date;
  url: string;
  protocol: string;
  tags: string[];
}

export const ListLight = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateModalOpen, setisCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCameraId, setCurrentCameraId] = useState("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      setIsUnauthorized(false);
      const response = await api.get("/cameras");
      const formattedCameras = response.data.map((cam: any) => ({
        id: cam.id,
        name: cam.name,
        image:
          cam.url ||
          "https://static.vecteezy.com/system/resources/previews/001/213/234/large_2x/interface-viewfinder-digital-camera-vector.jpg",
        addedAt: new Date(cam.addedAt),
        url: cam.url,
        protocol: cam.protocol,
        tags: cam.tags || [],
      }));

      setCameras(formattedCameras);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setIsUnauthorized(true);
        setError("Для просмотра камер необходимо авторизоваться");
      } else {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      }
      console.error("Ошибка загрузки камер:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname === "/cameras") {
      fetchCameras();
    }
  }, [location.pathname]);

  const handleAddCamera = async (newCamera: {
    name: string;
    url: string;
    protocol: string;
    description: string;
    tags: string[];
  }) => {
    try {
      await api.post("/add_camera", newCamera);
      if (location.pathname === "/cameras") {
        await fetchCameras();
      }
    } catch (err) {
      console.error("Ошибка при добавлении камеры:", err);
      throw err;
    }
  };

  const handleDelete = async (cameraId: string) => {
    try {
      const confirmed = window.confirm(
        "Вы уверены, что хотите удалить камеру?"
      );
      if (!confirmed) return;

      await api.delete(`/delete_camera/${cameraId}`);
      setCameras((prev) => prev.filter((cam) => cam.id !== cameraId));
    } catch (error) {
      console.error("Ошибка при удалении камеры:", error);
    }
  };

  const handleEditClick = (cameraId: string) => {
    setCurrentCameraId(cameraId);
    setIsEditModalOpen(true);
  };

  const getTimeAgo = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "Дата неизвестна";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (seconds < 60) return `${seconds} сек. назад`;
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    return `${days} дн. назад`;
  };

  const filteredCameras = cameras.filter((camera) => {
    const query = searchQuery.toLowerCase();
    return (
      camera.name.toLowerCase().includes(query) ||
      camera.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });


  if (isUnauthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl mb-4">
          Для доступа к камерам необходимо авторизоваться
        </div>
        <a
          href="http://localhost:5000/login/yandex"
          className="bg-[#2094f3] text-white px-4 py-2 rounded-xl text-sm font-bold"
        >
          Войти через Яндекс
        </a>
      </div>
    );
  }

  if (loading && cameras.length === 0) {
    return (
      <div className="flex justify-center items-center font-bold text-2xl h-screen">
        Загрузка...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen flex-col">
        <Button className="text-md" onClick={fetchCameras}>
          Повторить попытку
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white flex flex-col items-center w-full p-6">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className=" flex items-center w-[197px] h-10 [font-family:'Space_Grotesk',Helvetica] font-bold text-[#111518] text-[32px] tracking-[0] leading-10">
            Камеры
          </h1>

          <Button
            onClick={() => setisCreateModalOpen(true)}
            className=" h-10 bg-[#2094f3] hover:bg-[#1a7bc8] rounded-xl"
          >
            <span className="[font-family:'Space_Grotesk',Helvetica] font-bold text-white text-sm text-center tracking-[0.21px] leading-[21px]">
              Добавить трансляцию
            </span>
          </Button>
        </div>

        <div className="flex mb-8">
          <div className="flex items-center bg-[#f0f2f5] rounded-l-lg px-4">
            <SearchIcon className="w-6 h-6 text-gray-500" />
          </div>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#f0f2f5] rounded-l-none border-none [font-family:'Space_Grotesk',Helvetica] text-[#000000] text-base h-12"
            placeholder="Поиск по названию или URL"
          />
        </div>

        {filteredCameras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-black text-xl mb-6">
              {searchQuery ? "Ничего не найдено" : "Нет доступных камер"}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCameras.map((camera) => (
              <Card
                key={camera.id}
                className="relative w-full h-[160px] border-none shadow-sm rounded-lg cursor-pointer hover:shadow-md transition-all"
              >
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-35 bg-gray-100 rounded-xl shadow-lg border border-gray-200"
                    >
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(camera.id);
                        }}
                        className="text-center justify-center text-base py-2 hover:bg-gray-200"
                      >
                        Изменить
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(camera.id);
                        }}
                        className="text-center justify-center text-base py-2 text-red-600 hover:bg-red-50"
                      >
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardContent
                  className="p-0 h-full flex items-center relative" // добавлено relative для позиционирования тегов
                  onClick={() => navigate(`/camera/${camera.id}`)}
                >
                  <img
                    className="w-[280px] h-[140px] ml-4 object-cover rounded-md"
                    alt={camera.name}
                    src={camera.image}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "https://static.vecteezy.com/system/resources/previews/001/213/234/large_2x/interface-viewfinder-digital-camera-vector.jpg";
                    }}
                  />
                  <div className="ml-8 flex flex-col justify-center h-full flex-grow relative">
                    <div className="font-medium text-[#111518] text-xl mb-2">
                      {camera.name}
                    </div>
                    <div className="text-[#9cacba] text-lg mb-2">
                      Добавлена {getTimeAgo(camera.addedAt)}
                    </div>
                    <div className="text-base text-gray-400">
                      {camera.protocol} • {camera.url}
                    </div>

                    {/* Контейнер тегов - абсолютное позиционирование в правом нижнем углу */}
                    <div className="absolute bottom-2 right-2 flex flex-wrap gap-2 max-w-full">
                      {(camera.tags || []).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-300 text-gray-700 text-base px-3 py-1.5 rounded-lg whitespace-nowrap"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="relative">
              <Button
                variant="ghost"
                className="absolute top-4 right-4 z-10 rounded-full w-10 h-10 p-0 flex items-center justify-center bg-white hover:bg-gray-100"
                onClick={() => setisCreateModalOpen(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
              <CameraCreate
                onClose={() => setisCreateModalOpen(false)}
                onAdd={async (camera) => {
                  await handleAddCamera(camera);
                  setisCreateModalOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {isEditModalOpen && (
          <CameraEdit
            cameraId={currentCameraId}
            onClose={() => setIsEditModalOpen(false)}
            onSave={() => {
              fetchCameras();
              setIsEditModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
