import { XIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { PlusIcon } from "lucide-react";
import api from "../../api";

interface CameraClassSetting {
  class_id: number;
  class_name: string;
  is_ignored: boolean;
  is_notify: boolean;
}

interface CameraEditProps {
  cameraId: string;
  onClose: () => void;
  onSave: () => void;
}

export const CameraEdit = ({
  cameraId,
  onClose,
  onSave,
}: CameraEditProps): JSX.Element => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [cameraTags, setCameraTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [classSettings, setClassSettings] = useState<CameraClassSetting[]>([]);

  const MAX_TAGS = 5;

  useEffect(() => {
    const fetchCameraData = async () => {
      try {
        const response = await api.get(`/get_camera/${cameraId}`);
        const data = response.data;

        setName(data.name);
        setDescription(data.description || "");
        setCameraTags(data.tags || []);
        setClassSettings(data.class_settings || []);
      } catch (err) {
        console.error("Ошибка при загрузке данных камеры:", err);
        setError("Не удалось загрузить данные камеры");
      }
    };

    fetchCameraData();
  }, [cameraId]);

  const handleAddTag = () => {
    if (cameraTags.length >= MAX_TAGS) {
      setTagsError(`Максимум ${MAX_TAGS} тегов`);
      return;
    }

    const newTag = tagInput.trim();
    if (newTag && !cameraTags.includes(newTag)) {
      setCameraTags([...cameraTags, newTag]);
      setTagsError(null);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCameraTags(cameraTags.filter((tag) => tag !== tagToRemove));
    if (tagsError && cameraTags.length - 1 < MAX_TAGS) {
      setTagsError(null);
    }
  };

  const handleClassSettingChange = (
    classId: number,
    field: "is_ignored" | "is_notify",
    value: boolean
  ) => {
    setClassSettings((prev) =>
      prev.map((setting) =>
        setting.class_id === classId ? { ...setting, [field]: value } : setting
      )
    );
  };

  const isOnCamerasPage = location.pathname === "/cameras";

  const handleSave = async () => {
    if (!name) {
      setError("Название камеры обязательно");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const confirmed = window.confirm(
        "Вы уверены, что хотите изменить данные?"
      );
      if (!confirmed) return;

      await api.put(`/update_camera/${cameraId}`, {
        name,
        description,
        tags: cameraTags,
        class_settings: classSettings.map(
          ({ class_id, is_ignored, is_notify }) => ({
            class_id,
            is_ignored,
            is_notify,
          })
        ),
      });
      onSave();
      onClose();
      if (!isOnCamerasPage) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error("Ошибка при сохранении:", err);
      setError("Ошибка при сохранении изменений");
    } finally {
      setIsSaving(false);
    }
  };

  //   return (
  //     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  //       <div className="flex flex-col items-start relative w-full max-w-[480px] bg-white rounded-2xl">
  //         <Card className="flex flex-col w-full items-start px-0 py-5 relative overflow-hidden rounded-2xl shadow-lg">
  //           <CardContent className="p-0 w-full">
  //             <div className="flex flex-col h-[58px] items-start pt-5 pb-2 px-4 relative self-stretch w-full">
  //               <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Space_Grotesk',Helvetica] font-bold text-[#111416] text-2xl tracking-[0] leading-[30px]">
  //                 Редактировать камеру
  //               </h2>
  //             </div>

  //             {error && (
  //               <div className="px-4 text-red-500 text-sm mb-2">{error}</div>
  //             )}

  //             <div className="flex flex-col w-full gap-3 px-4">
  //               <div className="flex flex-col w-full">
  //                 <Input
  //                   value={name}
  //                   onChange={(e) => setName(e.target.value)}
  //                   className="h-14 p-4 w-full bg-[#eff2f4] rounded-xl"
  //                   placeholder="Название камеры*"
  //                 />
  //               </div>
  //               <div className="flex flex-col w-full">
  //                 <Input
  //                   value={description}
  //                   onChange={(e) => setDescription(e.target.value)}
  //                   className="h-14 p-4 w-full bg-[#eff2f4] rounded-xl resize-none"
  //                   placeholder="Описание"
  //                 />
  //               </div>

  //               <div className="flex flex-col w-full">
  //                 <div className="items-start w-full rounded-xl flex relative">
  //                   <Input
  //                     value={tagInput}
  //                     onChange={(e) => setTagInput(e.target.value)}
  //                     onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
  //                     className="h-14 pl-4 pr-2 py-4 mr-[5px] flex-1 grow rounded-l-xl bg-[#eff2f4]"
  //                     placeholder={`Тэги (максимум ${MAX_TAGS})`}
  //                   />
  //                   <Button
  //                     variant="ghost"
  //                     className="h-14 px-4 rounded-r-xl bg-[#eff2f4] hover:bg-[#e0e5e9]"
  //                     onClick={handleAddTag}
  //                     disabled={cameraTags.length >= MAX_TAGS}
  //                   >
  //                     <PlusIcon className="h-5 w-5 text-[#111416]" />
  //                   </Button>
  //                 </div>
  //                 {tagsError && (
  //                   <div className="text-red-500 text-xs mt-1">{tagsError}</div>
  //                 )}
  //                 <div className="text-xs text-gray-500 mt-1">
  //                   {cameraTags.length}/{MAX_TAGS} тегов
  //                 </div>
  //               </div>

  //               <div className="flex flex-wrap gap-2 mt-3 w-full justify-start">
  //                 {cameraTags.map((tag, index) => (
  //                   <div
  //                     key={index}
  //                     className="inline-flex h-14 items-center gap-4 px-4 bg-[#2193f2] rounded-xl"
  //                   >
  //                     <span
  //                       className="font-normal text-white text-base leading-6
  //                     [font-family:'Space_Grotesk',Helvetica]"
  //                     >
  //                       {tag}
  //                     </span>
  //                     <Button
  //                       variant="ghost"
  //                       size="icon"
  //                       className="p-0 h-7 w-7 hover:bg-transparent"
  //                       onClick={() => handleRemoveTag(tag)}
  //                     >
  //                       <XIcon className="h-5 w-5 text-white hover:text-gray-200" />
  //                     </Button>
  //                   </div>
  //                 ))}
  //               </div>

  //               <div className="mt-4">
  //                 <h3 className="text-lg font-bold mb-3">Настройки классов</h3>
  //                 <div className="overflow-x-auto">
  //                   <table className="w-full text-left border border-gray-200 rounded-lg bg-white">
  //                     <thead className="bg-gray-100 text-gray-700 text-sm">
  //                       <tr>
  //                         <th className="px-4 py-2 border-b">Класс</th>
  //                         <th className="px-4 py-2 border-b text-center">
  //                           Игнорировать
  //                         </th>
  //                         <th className="px-4 py-2 border-b text-center">
  //                           Уведомлять
  //                         </th>
  //                       </tr>
  //                     </thead>
  //                     <tbody>
  //                       {classSettings.map((setting) => (
  //                         <tr key={setting.class_id} className="hover:bg-gray-50">
  //                           <td className="px-4 py-2 border-b">
  //                             {setting.class_name}
  //                           </td>
  //                           <td className="px-4 py-2 border-b text-center">
  //                             <input
  //                               type="checkbox"
  //                               checked={setting.is_ignored}
  //                               onChange={(e) =>
  //                                 handleClassSettingChange(
  //                                   setting.class_id,
  //                                   "is_ignored",
  //                                   e.target.checked
  //                                 )
  //                               }
  //                             />
  //                           </td>
  //                           <td className="px-4 py-2 border-b text-center">
  //                             <input
  //                               type="checkbox"
  //                               checked={setting.is_notify}
  //                               onChange={(e) =>
  //                                 handleClassSettingChange(
  //                                   setting.class_id,
  //                                   "is_notify",
  //                                   e.target.checked
  //                                 )
  //                               }
  //                             />
  //                           </td>
  //                         </tr>
  //                       ))}
  //                     </tbody>
  //                   </table>
  //                 </div>
  //               </div>
  //             </div>

  //             <div className="flex items-center justify-end gap-3 px-4 py-3 w-full mt-3">
  //               <Button
  //                 variant="secondary"
  //                 className="w-[84px] h-10 bg-[#eff2f4] rounded-xl"
  //                 onClick={onClose}
  //                 disabled={isSaving}
  //               >
  //                 <span
  //                   className="font-bold text-[#111416] text-sm text-center
  //                 leading-[21px] [font-family:'Space_Grotesk',Helvetica] tracking-[0]"
  //                 >
  //                   Отмена
  //                 </span>
  //               </Button>
  //               <Button
  //                 className="w-[105px] h-10 bg-[#2193f2] rounded-xl"
  //                 onClick={handleSave}
  //                 disabled={isSaving}
  //               >
  //                 <span
  //                   className="font-bold text-white text-sm text-center
  //                 leading-[21px] [font-family:'Space_Grotesk',Helvetica] tracking-[0]"
  //                 >
  //                   {isSaving ? "Сохранение..." : "Сохранить"}
  //                 </span>
  //               </Button>
  //             </div>
  //           </CardContent>
  //         </Card>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="flex flex-col items-start relative w-full max-w-4xl bg-white rounded-2xl">
        <Card className="flex flex-col w-full items-start px-0 py-5 relative overflow-hidden rounded-2xl shadow-lg">
          <CardContent className="p-0 w-full">
            <div className="flex flex-col h-[58px] items-start pt-5 pb-2 px-6 relative self-stretch w-full">
              <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Space_Grotesk',Helvetica] font-bold text-[#111416] text-2xl tracking-[0] leading-[30px]">
                Редактировать камеру
              </h2>
            </div>

            {error && (
              <div className="px-6 text-red-500 text-sm mb-2">{error}</div>
            )}

            <div className="flex flex-row w-full gap-6 px-6">
              {/* Левый блок - Основные параметры камеры */}
              <div className="flex flex-col w-1/2 gap-3 mt-11">
                <div className="flex flex-col w-full">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 p-4 w-full bg-[#eff2f4] rounded-xl"
                    placeholder="Название камеры*"
                  />
                </div>
                <div className="flex flex-col w-full">
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-14 p-4 w-full bg-[#eff2f4] rounded-xl resize-none"
                    placeholder="Описание"
                  />
                </div>

                <div className="flex flex-col w-full">
                  <div className="items-start w-full rounded-xl flex relative">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      className="h-14 pl-4 pr-2 py-4 mr-[5px] flex-1 grow rounded-l-xl bg-[#eff2f4]"
                      placeholder={`Тэги (максимум ${MAX_TAGS})`}
                    />
                    <Button
                      variant="ghost"
                      className="h-14 px-4 rounded-r-xl bg-[#eff2f4] hover:bg-[#e0e5e9]"
                      onClick={handleAddTag}
                      disabled={cameraTags.length >= MAX_TAGS}
                    >
                      <PlusIcon className="h-5 w-5 text-[#111416]" />
                    </Button>
                  </div>
                  {tagsError && (
                    <div className="text-red-500 text-xs mt-1">{tagsError}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {cameraTags.length}/{MAX_TAGS} тегов
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 w-full justify-start">
                  {cameraTags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex h-14 items-center gap-4 px-4 bg-[#2193f2] rounded-xl"
                    >
                      <span className="font-normal text-white text-base leading-6 [font-family:'Space_Grotesk',Helvetica]">
                        {tag}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0 h-7 w-7 hover:bg-transparent"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <XIcon className="h-5 w-5 text-white hover:text-gray-200" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Правый блок - Настройки классов */}
              <div className="flex flex-col w-1/2">
                <h3 className="text-xl font-bold mb-4">Настройки классов</h3>
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-base font-medium text-gray-700"
                        >
                          Класс
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-center text-base font-medium text-gray-700"
                        >
                          Игнорировать
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-center text-base font-medium text-gray-700"
                        >
                          Уведомлять
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classSettings.map((setting) => (
                        <tr key={setting.class_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-base font-medium text-gray-900">
                              {setting.class_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="checkbox"
                              checked={setting.is_ignored}
                              onChange={(e) =>
                                handleClassSettingChange(
                                  setting.class_id,
                                  "is_ignored",
                                  e.target.checked
                                )
                              }
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="checkbox"
                              checked={setting.is_notify}
                              onChange={(e) =>
                                handleClassSettingChange(
                                  setting.class_id,
                                  "is_notify",
                                  e.target.checked
                                )
                              }
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-3 w-full mt-3">
              <Button
                variant="secondary"
                className="w-[84px] h-10 bg-[#eff2f4] rounded-xl"
                onClick={onClose}
                disabled={isSaving}
              >
                <span className="font-bold text-[#111416] text-sm text-center leading-[21px] [font-family:'Space_Grotesk',Helvetica] tracking-[0]">
                  Отмена
                </span>
              </Button>
              <Button
                className="w-[105px] h-10 bg-[#2193f2] rounded-xl"
                onClick={handleSave}
                disabled={isSaving}
              >
                <span className="font-bold text-white text-sm text-center leading-[21px] [font-family:'Space_Grotesk',Helvetica] tracking-[0]">
                  {isSaving ? "Сохранение..." : "Сохранить"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
