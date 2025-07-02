export const HomePage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6">
        Добро пожаловать в VisionGuard
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-blue-600">
          О веб-приложении
        </h2>
        <p className="mb-4 text-gray-700">
          VisionGuard - это веб-приложение с интеграцией интеллектуального
          модуля видеонаблюдения и контроля периметра территории, разработанное
          в рамках выпускной квалификационной работы.
        </p>

        <h3 className="text-xl font-medium mb-3 text-blue-500">
          Основные возможности:
        </h3>
        <ul className="list-disc pl-5 mb-6 space-y-2 text-gray-700">
          <li>Обнаружение и классификация объектов в реальном времени</li>
          <li>Отслеживание перемещения объектов</li>
          <li>Уведомления о событиях</li>
          <li>Хранение обработанных данных</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-blue-600">О работе</h2>
        <p className="text-gray-700">
          Данное веб-приложение разработано как выпускная квалификационная
          работа студента 4 курса направления "Программная инженерия" Яворского
          Владислава. Научный руководитель: Тараканов Дмитрий Викторович
        </p>
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-blue-800">
          Для работы с веб-приложением используйте меню навигации в верхней
          части страницы.
        </p>
      </div>
    </div>
  );
};
