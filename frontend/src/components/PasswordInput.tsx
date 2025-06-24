import React from "react";

interface PasswordInputProps {
	id: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder: string;
	required?: boolean;
	className?: string;
}

export default function PasswordInput({
	id,
	value,
	onChange,
	placeholder,
	required = false,
	className = "",
}: PasswordInputProps) {
	return (
		<div className="relative">
			<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<svg
					className="w-5 h-5 text-[#7D8E98] group-focus-within:text-[#2AABEE] transition-colors duration-200"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
			</div>
			<input
				id={id}
				type="password"
				value={value}
				onChange={onChange}
				required={required}
				className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#17212B]/80 backdrop-blur-sm border border-[#2F3B4A] !text-white placeholder-[#7D8E98] focus:outline-none focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE] focus:ring-opacity-20 transition-all duration-200 hover:border-[#3F4B5A] ${className}`}
				style={{ padding: "0.3rem", borderRadius: ".3rem" }}
				placeholder={placeholder}
			/>
		</div>
	);
}
