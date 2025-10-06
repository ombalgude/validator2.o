import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import {
	ShieldCheck,
	Mail,
	Lock,
	LogIn,
	Loader,
	AlertTriangle,
} from "lucide-react";

const ParticleCanvas = () => {
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

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const url = "http://localhost:5000/api";

	const submit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			const res = await axios.post("/api/auth/login", {
				email,
				password,
			});
			localStorage.setItem("token", res.data.token);
			navigate("/dashboard", { replace: true });
		} catch (err) {
			const msg =
				err.response?.data?.message ||
				err.message ||
				"An error occurred. Please try again.";
			setError(msg);
		} finally {
			setLoading(false);
		}
	};

	const Feature = ({ icon: Icon, text }) => (
		<li className="flex items-center gap-3">
			<div className="flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full">
				<Icon className="w-5 h-5 text-white" />
			</div>
			<span className="text-indigo-100">{text}</span>
		</li>
	);

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4 font-sans">
			<ParticleCanvas />
			<div className="w-full max-w-4xl flex flex-col md:flex-row bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
				{/* Left Panel: Login Form */}
				<div className="w-full md:w-1/2 p-8 md:p-12 rounded-2xl rounded-r-none border border-r-0 border-zinc-300/50">
					<h2 className="text-3xl font-bold text-white mb-2">
						Welcome Back!
					</h2>
					<p className="text-gray-400 mb-8">
						Please enter your details to sign in.
					</p>

					<form onSubmit={submit} className="space-y-6">
						<div>
							<label className="block mb-1 text-sm font-medium text-gray-400">
								Email
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
						</div>

						<div>
							<div className="flex justify-between items-center mb-1">
								<label className="text-sm font-medium text-gray-400">
									Password
								</label>
								<a
									href="#"
									className="text-xs text-indigo-400 hover:underline font-medium"
								>
									Forgot Password?
								</a>
							</div>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									required
								/>
							</div>
						</div>

						{error && (
							<div className="flex items-center gap-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg">
								<AlertTriangle className="w-5 h-5" />
								<span>{error}</span>
							</div>
						)}

						<Button
							type="submit"
							className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-lg font-semibold py-3 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-indigo-400"
							disabled={loading}
						>
							<span>{loading ? "Signing in…" : "Sign in"}</span>
							{loading ? (
								<Loader className="animate-spin" />
							) : (
								<LogIn className="w-6 h-6" />
							)}
						</Button>

						<p className="text-sm text-center text-gray-500">
							Don't have an account?{" "}
							<Link
								to="/register"
								className="text-indigo-400 hover:underline font-medium"
							>
								Sign Up
							</Link>
						</p>
					</form>
				</div>

				{/* Right Panel: Branding & Features */}
				<div className="hidden md:flex flex-col justify-between w-full md:w-1/2 p-8 bg-indigo-600 text-white">
					<div>
						<div className="font-extrabold text-3xl flex items-center gap-2 mb-8">
							<ShieldCheck className="w-9 h-9" />
							ValidX
						</div>
						<h1 className="text-4xl font-bold leading-tight mb-4">
							Unlock the Power of Trust.
						</h1>
						<p className="text-indigo-200 leading-relaxed">
							Sign in to access our industry-leading platform for
							verifying and managing academic certificates with
							confidence.
						</p>
					</div>
					<ul className="space-y-4">
						<Feature
							icon={ShieldCheck}
							text="AI-Powered Tamper Detection"
						/>
						<Feature
							icon={LogIn}
							text="Streamlined Institution Workflows"
						/>
						<Feature icon={Mail} text="Real-Time Status Updates" />
					</ul>
				</div>
			</div>
		</div>
	);
}
