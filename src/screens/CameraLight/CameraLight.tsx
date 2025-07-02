import { PlayIcon, SettingsIcon } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { useParams } from "react-router-dom";
import api from "../../api";
import { CameraEdit } from "../CameraEdit";

interface DetectedObject {
  id: number;
  tracker_id: number;
  object_class: string;
  start_time: string;
  image_path: string | null;
  video_path: string | null;
}

type TabValue =
  | "all"
  | "person"
  | "car"
  | "truck"
  | "bus"
  | "motorcycle"
  | "bicycle";

const TABS_CONFIG: { value: TabValue; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "person", label: "Человек" },
  { value: "car", label: "Машина" },
  { value: "truck", label: "Грузовик" },
  { value: "bus", label: "Автобус" },
  { value: "motorcycle", label: "Мотоцикл" },
  { value: "bicycle", label: "Велосипед" },
];

// Общие стили для табов
const tabTriggerClasses = `
  data-[state=active]:border-b-[3px] 
  data-[state=active]:border-[#111518] 
  data-[state=active]:shadow-none 
  data-[state=active]:text-[#111518] 
  data-[state=inactive]:text-[#60778a] 
  h-[53px] rounded-none px-4 
  [font-family:'Space_Grotesk',Helvetica] 
  font-bold text-sm tracking-[0.21px]
`;

export const CameraLight = (): JSX.Element => {
  const { id } = useParams();
  const [camera, setCamera] = useState<any>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "person" | "car" | "truck" | "bus" | "motorcycle" | "bicycle"  >("all");
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [modalVideo, setModalVideo] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchCamera = async () => {
      try {
        const response = await api.get(`/get_camera/${id}`);
        setCamera(response.data);
      } catch (error) {
        console.error("Ошибка при загрузке камеры", error);
        if ((error as any).response?.status === 401) {
          window.location.href = "/login";
        }
      }
    };

    fetchCamera();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchDetectedObjects = async () => {
      setLoadingObjects(true);
      try {
        const response = await api.get<DetectedObject[]>(
          `/detected_objects/${id}`
        );
        setDetectedObjects(response.data);
      } catch (error) {
        console.error("Ошибка при загрузке обнаруженных объектов", error);
      } finally {
        setLoadingObjects(false);
      }
    };

    fetchDetectedObjects();
  }, [id]);


  useEffect(() => {
    if (!id) return;

    const eventSource = new EventSource(
      `http://localhost:5000/sse/detected_objects/${id}`
    );
    eventSource.onmessage = (event) => {
      const newObjects = JSON.parse(event.data) as DetectedObject[];
      setDetectedObjects(newObjects);
    };
    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, activeTab]);

  const openFullscreen = () => {
    const elem = videoContainerRef.current;
    if (!elem) return;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  };

  const classMap: Record<string, string> = {
    person: "человек",
    car: "машина",
    bus: "автобус",
    bicycle: "велосипед",
    truck: "грузовик",
    motorcycle: "мотоцикл",
    unknown: "не определен",
  };

  const getClassNameRus = (engClass: string) => {
    return classMap[engClass.toLowerCase()] || engClass;
  };

  const filteredObjects = detectedObjects.filter((obj) => {
    if (activeTab === "all") return true;
    return obj.object_class.toLowerCase() === activeTab;
  });


  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  if (!camera) {
    return (
      <div className="flex justify-center items-center font-bold text-2xl h-screen">
        Загрузка камеры...
      </div>
    );
  }
  return (
    <div className="relative w-full h-screen bg-white">
      <main className="max-w-[960px] mx-auto pt-[20px]">
        <div className="flex items-center justify-between ml-4 mr-4 mb-6">
          <h1 className="text-[32px] font-bold [font-family:'Space_Grotesk',Helvetica] text-[#111518] leading-10 flex items-center gap-2">
            {camera?.name || "Камера без названия"}
            {/* Иконка шестеренки без фона, рядом с названием */}
            <SettingsIcon
              className="cursor-pointer text-[#111518] hover:text-gray-600"
              onClick={() => setIsEditModalOpen(true)}
              size={20}
              aria-label="Настройки камеры"
            />
          </h1>

          {/* Теги справа у края, отдельный блок с выравниванием по правому краю */}
          <div className="flex flex-wrap items-center justify-end gap-2 max-w-[40%]">
            {camera?.tags?.map((tag: string, index: number) => (
              <span
                key={index}
                className="bg-gray-200 text-gray-800 text-md px-4 py-2 rounded-full whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <Tabs defaultValue="stream" className="w-full">
          <div className="border-b border-[#dbe1e6]">
            <TabsList className="bg-transparent h-[54px] p-0">
              <TabsTrigger
                value="stream"
                className="data-[state=active]:border-b-[3px] 
                data-[state=active]:border-[#111518] 
                data-[state=active]:shadow-none 
                data-[state=active]:text-[#111518] 
                data-[state=inactive]:text-[#60778a] 
                h-[53px] rounded-none px-4 [font-family:'Space_Grotesk',Helvetica] 
                font-bold text-sm tracking-[0.21px]"
              >
                Трансляция
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stream" className="mt-0">
            <div
              ref={videoContainerRef}
              className="relative w-full bg-black flex items-center justify-center"
              style={{ height: "540px" }}
            >
              <img
                src={`http://localhost:5000/video_feed/${id}`}
                alt="Camera Stream"
                className="w-full h-full object-cover"
                style={{ maxHeight: "100%" }}
              />
              {/* Кнопка fullscreen */}
              <button
                onClick={openFullscreen}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded hover:bg-opacity-75 transition"
                aria-label="Открыть видео на весь экран"
              >
                Полный экран
              </button>
            </div>
          </TabsContent>
          {camera?.description && (
            <div className="bg-[#F9F9F9] border border-gray-200 rounded-xl p-4 mt-6">
              <p className="text-[#4A4A4A] text-lg leading-relaxed">
                {camera.description}
              </p>
            </div>
          )}
        </Tabs>

        <Tabs
          defaultValue={activeTab}
          onValueChange={(val) => setActiveTab(val as TabValue)}
          className="w-full mt-6"
          style={{ scrollBehavior: "auto" }}
        >
          <div className="border-b border-[#dbe1e6]">
            <TabsList className="bg-transparent h-[54px] p-0">
              {TABS_CONFIG.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={tabTriggerClasses}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-6 space-y-8">
            {loadingObjects ? (
              <div>Загрузка объектов...</div>
            ) : filteredObjects.length === 0 ? (
              <div>Объекты не найдены</div>
            ) : (
              filteredObjects.map((obj) => (
                <Card
                  key={obj.id}
                  className="flex justify-between items-center border-none shadow-none"
                >
                  <CardContent className="p-0 pl-4">
                    <h3 className="font-bold text-[#111518] text-base leading-5">
                      Обнаружен объект "{getClassNameRus(obj.object_class)}"
                    </h3>
                    <p className="text-[#60778a] text-sm">
                      {formatTime(obj.start_time)}
                    </p>
                  </CardContent>

                  {/* Превью видео с возможностью открытия в модальном окне */}
                  <div
                    className="w-[304px] h-[171px] relative cursor-pointer group"
                    onClick={() =>
                      obj.video_path &&
                      setModalVideo(
                        `http://localhost:5000/detected_videos/${obj.video_path
                          .split("/")
                          .pop()}`
                      )
                    }
                  >
                    {/* Превью (первый кадр) */}
                    {obj.image_path && (
                      <img
                        src={`http://localhost:5000${obj.image_path}`}
                        className="w-full h-full object-cover rounded-md"
                        alt="Превью видео"
                      />
                    )}

                    {/* Иконка play при наведении */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <PlayIcon className="text-white w-10 h-10" />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Модальное окно */}
      {modalVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="relative w-full max-w-4xl">
            <video
              controls
              autoPlay
              className="w-full max-h-[90vh]"
              src={modalVideo}
            />
            <button
              onClick={() => setModalVideo(null)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full hover:bg-opacity-75 transition"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <CameraEdit
          cameraId={id || ""}
          onClose={() => setIsEditModalOpen(false)}
          onSave={() => {
            // Можно добавить обновление данных камеры после сохранения
            const fetchCamera = async () => {
              const response = await api.get(`/get_camera/${id}`);
              setCamera(response.data);
            };
            fetchCamera();
          }}
        />
      )}
    </div>
  );
};
