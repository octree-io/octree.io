import { useState, useEffect } from "react";

const TriviaRoomCountdownTimer = ({ timeRemaining }: { timeRemaining: number }) => {
  const [timeLeft, setTimeLeft] = useState(timeRemaining);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prevTime - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <div className="trivia-room-timer">
      {formatTime(timeLeft)}
    </div>
  );
};

export default TriviaRoomCountdownTimer;
