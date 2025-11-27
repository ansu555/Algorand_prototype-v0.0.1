import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
}

export const Logo = ({ className }: LogoProps) => {
    return (
        <div className={cn("flex items-center font-extrabold text-lg md:text-xl tracking-tight", className)}>
            <img
                src="/10xswap_logo.png"
                alt="10xSwap Logo"
                className="h-8 w-8 mr-2"
            />
            <span className="text-primary dark:text-[#F3C623]">10x</span>
            <span className="dark:text-white">Swap</span>
        </div>
    );
};
