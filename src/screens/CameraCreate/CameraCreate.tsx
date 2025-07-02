import { XIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

interface CameraCreateProps {
  onClose: () => void;
  onAdd: (camera: {
    name: string;
    url: string;
    protocol: string;
    description: string;
    tags: string[];
  }) => Promise<void>;
}

export const CameraCreate = ({
  onClose,
  onAdd,
}: CameraCreateProps): JSX.Element => {
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [cameraTags, setCameraTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const protocolOptions = ["RTSP", "HTTP"];

  const MAX_TAGS = 5;

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

  const handleProtocolSelect = (protocol: string) => {
    setSelectedProtocol(protocol);
  };

  const handleSave = async () => {
    if (!name || !url || !selectedProtocol) {
      setError("Заполните все обязательные поля");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      await onAdd({
        name,
        url,
        protocol: selectedProtocol,
        description,
        tags: cameraTags,
      });
      onClose();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setIsUnauthorized(true);
        setError("Для добавления камеры необходимо авторизоваться");
      } else {
        setError("Ошибка при сохранении камеры");
      }
      console.error("Ошибка при сохранении:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isUnauthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="text-xl mb-4">
          Для добавления камеры необходимо авторизоваться
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

  return (
    <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] bg-white rounded-2xl">
      <Card className="flex flex-col max-w-[480px] min-w-[480px] w-full items-start px-0 py-5 relative overflow-hidden rounded-2xl shadow-lg">
        <CardContent className="p-0 w-full">
          <div className="flex flex-col h-[58px] items-start pt-5 pb-2 px-4 relative self-stretch w-full">
            <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Space_Grotesk',Helvetica] font-bold text-[#111416] text-2xl tracking-[0] leading-[30px]">
              Добавить трансляцию
            </h2>
          </div>

          {error && (
            <div className="px-4 text-red-500 text-sm mb-2">{error}</div>
          )}

          <div className="flex flex-col w-full gap-3 px-4">
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
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-14 p-4 w-full bg-[#eff2f4] rounded-xl"
                placeholder="Ссылка на камеру*"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-500">Протокол*</span>
              <div className="flex flex-wrap items-start gap-3 w-full">
                {protocolOptions.map((protocol) => (
                  <Button
                    key={protocol}
                    variant="outline"
                    className={`h-11 px-4 py-0 rounded-xl border border-solid ${
                      selectedProtocol === protocol
                        ? "border-[#2193f2] bg-[#2193f2] text-white"
                        : "border-[#dbe0e5] bg-white"
                    }`}
                    onClick={() => handleProtocolSelect(protocol)}
                  >
                    <span className="[font-family:'Space_Grotesk',Helvetica] font-medium text-sm tracking-[0] leading-[21px]">
                      {protocol}
                    </span>
                  </Button>
                ))}
              </div>
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
                  <span
                    className="font-normal text-white text-base leading-6 
                  [font-family:'Space_Grotesk',Helvetica]"
                  >
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

          <div className="flex items-center justify-end gap-3 px-4 py-3 w-full mt-3">
            <Button
              variant="secondary"
              className="w-[84px] h-10 bg-[#eff2f4] rounded-xl"
              onClick={onClose}
              disabled={isSaving}
            >
              <span
                className="font-bold text-[#111416] text-sm text-center 
              leading-[21px] [font-family:'Space_Grotesk',Helvetica] tracking-[0]"
              >
                Отмена
              </span>
            </Button>
            <Button
              className="w-[105px] h-10 bg-[#2193f2] rounded-xl"
              onClick={handleSave}
              disabled={isSaving}
            >
              <span
                className="font-bold text-white text-sm text-center 
              leading-[21px] [font-family:'Space_Grotesk',Helvetica] tracking-[0]"
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
