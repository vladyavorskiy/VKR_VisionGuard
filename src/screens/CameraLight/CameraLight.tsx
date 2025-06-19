import {
    BellIcon,
    PlayIcon,
    PlusIcon,
    SearchIcon,
    SettingsIcon,
  } from "lucide-react";
  import React, { useEffect, useState } from "react";
  import { Avatar } from "../../components/ui/avatar";
  import { Button } from "../../components/ui/button";
  import { Card, CardContent } from "../../components/ui/card";
  import { Input } from "../../components/ui/input";
  import { useParams } from "react-router-dom";
  import api from "../../api";

  import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from "../../components/ui/tabs";

  const detectionEvents = [
    {
      type: "яма",
      time: "2 минуты назад",
      image: "https://c.animaapp.com/mb9j5x89NgOb2T/img/image-2.png",
    },
    {
      type: "яма",
      time: "5 минуты назад",
      image: "https://c.animaapp.com/mb9j5x89NgOb2T/img/image-3.png",
    },
    {
      type: "горка",
      time: "37 минут назад",
      image: "https://c.animaapp.com/mb9j5x89NgOb2T/img/image-4.png",
    },
    {
      type: "горка",
      time: "1 час назад",
      image: "https://c.animaapp.com/mb9j5x89NgOb2T/img/image-5.png",
    },
  ];
  
  export const CameraLight = (): JSX.Element => {

    const { id } = useParams();

    const [camera, setCamera] = useState<any>(null);

    useEffect(() => {
      const fetchCamera = async () => {
        try {
          const response = await api.get(`/get_camera/${id}`);
          setCamera(response.data);
        } catch (error) {
          console.error("Ошибка при загрузке камеры", error);
          if ((error as any).response?.status === 401) {
            window.location.href = '/login';
          }
        }
      };
  
      fetchCamera();
    }, [id]);
  
    if (!camera) return <div className="p-4">Загрузка камеры...</div>;

    return (
      <div className="relative w-full h-screen bg-white">
        <main className="max-w-[960px] mx-auto pt-[20px]">
          <h1 className="text-[32px] font-bold [font-family:'Space_Grotesk',Helvetica] 
          text-[#111518] leading-10 ml-4 mb-6">
            {camera?.name || "Камера без названия"}
          </h1>
  
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
                <TabsTrigger
                  value="recordings"
                  className="data-[state=active]:border-b-[3px] 
                  data-[state=active]:border-[#111518] 
                  data-[state=active]:shadow-none 
                  data-[state=active]:text-[#111518] 
                  data-[state=inactive]:text-[#60778a] 
                  h-[53px] rounded-none px-4 [font-family:'Space_Grotesk',Helvetica] 
                  font-bold text-sm tracking-[0.21px]"
                >
                  Записи
                </TabsTrigger>
              </TabsList>
            </div>
  

          <TabsContent value="stream" className="mt-0">
            <div className="relative w-full h-[540px] bg-black flex items-center justify-center">
              <img
                src={`http://localhost:5000/video_feed/${id}`}
                alt="Camera Stream"
                className="w-full h-full object-cover"
                style={{ maxHeight: "540px" }}
              />
            </div>
          </TabsContent>
          </Tabs>
  
          <Tabs defaultValue="all" className="w-full mt-6">
            <div className="border-b border-[#dbe1e6]">
              <TabsList className="bg-transparent h-[54px] p-0">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#111518] 
                  data-[state=active]:shadow-none data-[state=active]:text-[#111518] 
                  data-[state=inactive]:text-[#60778a] h-[53px] rounded-none px-4 
                  [font-family:'Space_Grotesk',Helvetica] font-bold text-sm tracking-[0.21px]"
                >
                  Все
                </TabsTrigger>
                <TabsTrigger
                  value="pits"
                  className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#111518] 
                  data-[state=active]:shadow-none data-[state=active]:text-[#111518] 
                  data-[state=inactive]:text-[#60778a] h-[53px] rounded-none px-4 
                  [font-family:'Space_Grotesk',Helvetica] font-bold text-sm tracking-[0.21px]"
                >
                  Ямы
                </TabsTrigger>
                <TabsTrigger
                  value="hills"
                  className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#111518] 
                  data-[state=active]:shadow-none data-[state=active]:text-[#111518] 
                  data-[state=inactive]:text-[#60778a] h-[53px] rounded-none px-4 
                  [font-family:'Space_Grotesk',Helvetica] font-bold text-sm tracking-[0.21px]"
                >
                  Горки
                </TabsTrigger>
              </TabsList>
            </div>
  
            <TabsContent value="all" className="mt-6 space-y-8">
              {detectionEvents.map((event, index) => (
                <Card
                  key={index}
                  className="flex justify-between items-center border-none shadow-none"
                >
                  <CardContent className="p-0 pl-4">
                    <h3 className="[font-family:'Space_Grotesk',Helvetica] font-bold 
                    text-[#111518] text-base leading-5">
                      Обнаружена {event.type}
                    </h3>
                    <p className="[font-family:'Space_Grotesk',Helvetica] font-normal 
                    text-[#60778a] text-sm leading-[21px]">
                      {event.time}
                    </p>
                  </CardContent>
                  <img
                    className="w-[304px] h-[171px]"
                    alt={`Обнаружена ${event.type}`}
                    src={event.image}
                  />
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  };
  