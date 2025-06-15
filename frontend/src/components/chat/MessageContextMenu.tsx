import { useEffect, useRef, useState } from "react";

interface MessageContextMenuProps {
	x: number;
	y: number;
	onClose: () => void;
	onDelete: () => void;
	onReply: () => void;
	messageContent: string;
}

export default function MessageContextMenu({
	x,
	y,
	onClose,
	onDelete,
	onReply,
	messageContent,
}: MessageContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState({ x, y });
	const [copySuccess, setCopySuccess] = useState(false);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				onClose();
			}
		};

		const updatePosition = () => {
			if (!menuRef.current) return;

			const menuWidth = menuRef.current.offsetWidth;
			const menuHeight = menuRef.current.offsetHeight;
			const windowWidth = window.innerWidth;
			const windowHeight = window.innerHeight;

			let newX = x;
			let newY = y;

			if (x + menuWidth > windowWidth) {
				newX = windowWidth - menuWidth - 5;
			}

			if (y + menuHeight > windowHeight) {
				newY = windowHeight - menuHeight - 5;
			}

			if (newX < 0) {
				newX = 5;
			}

			if (newY < 0) {
				newY = 5;
			}

			setPosition({ x: newX, y: newY });
		};

		updatePosition();

		window.addEventListener("resize", updatePosition);
		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			window.removeEventListener("resize", updatePosition);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [x, y, onClose]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(messageContent);
			setCopySuccess(true);
			setTimeout(() => {
				setCopySuccess(false);
				onClose();
			}, 1000);
		} catch (err) {}
	};

	const handleReply = () => {
		onReply();
		onClose();
	};

	return (
		<div
			ref={menuRef}
			className="fixed bg-[#242F3D] rounded-lg shadow-2xl border border-[#2F3B4A] py-1 z-50 min-w-[140px] text-sm"
			style={{
				top: position.y,
				left: position.x,
			}}
		>
			<button
				onClick={handleReply}
				className="w-full px-4 py-2 text-left text-[#B8C5D1] hover:bg-[#2F3B4A] flex items-center space-x-3 transition-colors duration-200"
			>
				<span className="text-sm">↩️</span>
				<span>Відповісти</span>
			</button>
			<button
				onClick={handleCopy}
				className="w-full px-4 py-2 text-left text-[#B8C5D1] hover:bg-[#2F3B4A] flex items-center space-x-3 transition-colors duration-200"
			>
				<span className="text-sm">📋</span>
				<span className={copySuccess ? "text-[#2AABEE]" : ""}>
					{copySuccess ? "Скопійовано!" : "Копіювати"}
				</span>
			</button>
			<button
				onClick={onDelete}
				className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900 hover:bg-opacity-50 flex items-center space-x-3 transition-colors duration-200"
			>
				<span className="text-sm">🗑️</span>
				<span>Видалити</span>
			</button>
		</div>
	);
}
