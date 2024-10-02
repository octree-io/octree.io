import { useEffect, useState } from "react";

interface CountdownProps {
  currentRoundStartTime: number;
  roundDuration: number;
}

const GameRoomCountdownTimer = ({ currentRoundStartTime, roundDuration }: CountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const roundEndTime = new Date(currentRoundStartTime).getTime() + roundDuration;

    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      const remaining = Math.max(0, roundEndTime - currentTime);
      setTimeRemaining(Math.floor(remaining / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentRoundStartTime, roundDuration]);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  return (
    <div className="game-room-timer">
      {formatTime(timeRemaining)}
    </div>
  );
};

export default GameRoomCountdownTimer;
