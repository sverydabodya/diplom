export default function EmptyChat() {
	return (
		<div className="flex-1 flex items-center justify-center bg-[#0E1621] px-4">
			<div className="text-center">
				<div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#2AABEE] rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg">
					<span className="text-white text-2xl sm:text-3xl font-bold">💬</span>
				</div>
				<h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-3">
					Вітаємо!
				</h2>
				<p className="text-[#7D8E98] text-base sm:text-lg">
					Оберіть чат зі списку або створіть новий
				</p>
				<div className="mt-6 sm:mt-8 flex justify-center space-x-2 sm:space-x-4">
					<div className="w-2 h-2 bg-[#2AABEE] rounded-full"></div>
					<div className="w-2 h-2 bg-[#2AABEE] rounded-full"></div>
					<div className="w-2 h-2 bg-[#2AABEE] rounded-full"></div>
				</div>
			</div>
		</div>
	);
}
