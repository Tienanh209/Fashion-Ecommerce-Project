import { useAuth } from "../../contexts/AuthContext";

export default function AnnouncementBar() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <div className="bg-black text-white text-center text-xs md:text-sm py-2 px-3">
      Sign up and get 20% off your first order — <a href="/register" className="underline">Sign up now</a>
    </div>
  );
}
