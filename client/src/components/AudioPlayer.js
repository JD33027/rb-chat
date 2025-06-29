import React, { useState, useRef, useEffect } from 'react';

const formatTime = (time) => {
  if (!isFinite(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    const setAudioData = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const setAudioTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('durationchange', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);

    return () => {
      audio.removeEventListener('durationchange', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Audio play failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    if (!progressBarRef.current || !isFinite(duration)) return;
    const bounds = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = Math.max(0, Math.min(1, x / bounds.width));
    audioRef.current.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  const handleMouseDown = (e) => {
    setIsSeeking(true);
    handleSeek(e);
  };

  const handleMouseMove = (e) => {
    if (isSeeking) handleSeek(e);
  };

  const handleMouseUp = () => setIsSeeking(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 w-full" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <audio ref={audioRef} src={src} preload="metadata" onEnded={() => setIsPlaying(false)} />
      <button onClick={togglePlayPause} className="p-2 text-white rounded-full bg-emerald-600 hover:bg-emerald-700 transition-transform active:scale-90">
        {isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>}
      </button>
      <div ref={progressBarRef} onMouseDown={handleMouseDown} className="flex-1 h-1.5 bg-gray-400 rounded-full cursor-pointer relative group">
        <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }}></div>
        <div className="absolute h-3 w-3 bg-white rounded-full -top-1 transform -translate-x-1/2 opacity-0 group-hover:opacity-100" style={{ left: `${progress}%` }}></div>
      </div>
      <span className="text-xs text-gray-200 font-mono w-10 text-center">{formatTime(currentTime)}</span>
    </div>
  );
};

export default AudioPlayer;