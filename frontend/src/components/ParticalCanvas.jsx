import React, { useCallback, useEffect, useRef } from "react";

export const ParticleCanvas = () => {
	const canvasRef = useRef(null);
	const mouse = useRef({
		x: window.innerWidth / 2,
		y: window.innerHeight / 2,
	});

	const handleMouseMove = useCallback((event) => {
		mouse.current.x = event.clientX;
		mouse.current.y = event.clientY;
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		let particlesArray = [];

		const setCanvasSize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};

		setCanvasSize();
		window.addEventListener("resize", setCanvasSize);
		window.addEventListener("mousemove", handleMouseMove);

		class Particle {
			constructor(x, y, size, color, directionX, directionY) {
				this.x = x;
				this.y = y;
				this.size = size;
				this.color = color;
				this.baseX = this.x; // Original position for parallax effect
				this.baseY = this.y;
				this.directionX = directionX;
				this.directionY = directionY;
			}

			draw() {
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
				ctx.fillStyle = this.color;
				ctx.fill();
			}

			update() {
				this.baseX += this.directionX;
				this.baseY += this.directionY;

				if (this.baseX > canvas.width + this.size)
					this.baseX = -this.size;
				if (this.baseX < -this.size)
					this.baseX = canvas.width + this.size;
				if (this.baseY > canvas.height + this.size)
					this.baseY = -this.size;
				if (this.baseY < -this.size)
					this.baseY = canvas.height + this.size;

				let dx = mouse.current.x - canvas.width / 2;
				let dy = mouse.current.y - canvas.height / 2;

				this.x = this.baseX + dx * (this.size / 20);
				this.y = this.baseY + dy * (this.size / 20);

				this.draw();
			}
		}

		const init = () => {
			particlesArray = [];
			let numberOfParticles = 300;
			for (let i = 0; i < numberOfParticles; i++) {
				let size = Math.random() * 1.5 + 0.5;
				let x = Math.random() * window.innerWidth;
				let y = Math.random() * window.innerHeight;
				let color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`;

				let directionY = (Math.random() - 0.5) * 0.3;
				let directionX = (Math.random() - 0.5) * 0.3;

				particlesArray.push(
					new Particle(x, y, size, color, directionX, directionY)
				);
			}
		};

		let animationFrameId;
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			particlesArray.forEach((p) => p.update());
		};

		init();
		animate();

		return () => {
			window.removeEventListener("resize", setCanvasSize);
			window.removeEventListener("mousemove", handleMouseMove);
			cancelAnimationFrame(animationFrameId);
		};
	}, [handleMouseMove]);

	return (
		<canvas
			ref={canvasRef}
			className="fixed top-0 left-0 w-full h-full -z-10 bg-indigo-950"
		></canvas>
	);
};
