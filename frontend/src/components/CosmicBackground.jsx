import React, { useEffect, useRef } from 'react';

/**
 * Cosmic Animated Starfield & Particles (Reference 1)
 */
export default function CosmicBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create 120 cosmic stars with varying speed, radius, and twinkle
    const numStars = 110;
    const stars = Array.from({ length: numStars }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.7 + 0.3,
      alphaSpeed: Math.random() * 0.015 + 0.005,
      increasing: Math.random() > 0.5,
      color: Math.random() > 0.3 ? '#ffffff' : Math.random() > 0.5 ? '#818cf8' : '#34d399'
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle deep nebula gradients
      const grad1 = ctx.createRadialGradient(width * 0.2, height * 0.3, 0, width * 0.2, height * 0.3, width * 0.5);
      grad1.addColorStop(0, 'rgba(79, 70, 229, 0.07)');
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(width * 0.8, height * 0.7, 0, width * 0.8, height * 0.7, width * 0.6);
      grad2.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Draw and update stars
      for (const star of stars) {
        star.x += star.vx;
        star.y += star.vy;

        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        // Twinkle effect
        if (star.increasing) {
          star.alpha += star.alphaSpeed;
          if (star.alpha >= 0.9) star.increasing = false;
        } else {
          star.alpha -= star.alphaSpeed;
          if (star.alpha <= 0.2) star.increasing = true;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="cosmic-stars fixed inset-0 pointer-events-none z-0"
    />
  );
}
