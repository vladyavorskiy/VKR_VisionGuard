import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { CameraLight } from "./screens/CameraLight";
import { ListLight } from "./screens/ListLight";
import { HomePage } from "./screens/HomePage";

export const App = () => {
  return (
    <Router>
      <div className="bg-white flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/home" element={<HomePage />} />
            <Route path="/camera/:id" element={<CameraLight />} />
            <Route path="/cameras" element={<ListLight />} />
            <Route path="/" element={<HomePage />} /> 
          </Routes>
        </main>
      </div>
    </Router>
  );
};
