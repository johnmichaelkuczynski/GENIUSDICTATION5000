import { GPTBypassSectionNew } from "@/components/gpt-bypass/GPTBypassSectionNew";

export default function GPTBypass() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          GPT Bypass & Humanizer
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Transform AI-generated content with advanced humanization techniques and style transfer
        </p>
      </div>
      
      <GPTBypassSectionNew />
    </div>
  );
}