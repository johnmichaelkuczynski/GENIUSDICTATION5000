import DictationSectionFixed from "@/components/DictationSectionFixed";
import DocumentDropzone from "@/components/DocumentDropzone";
import StyleLibrarySection from "@/components/StyleLibrarySection";
import ContentLibrarySection from "@/components/ContentLibrarySection";
import { GPTBypassSection } from "@/components/gpt-bypass/GPTBypassSection";
import { Separator } from "@/components/ui/separator";

const Home = () => {
  return (
    <>
      <DictationSectionFixed />
      <DocumentDropzone />
      <StyleLibrarySection />
      <ContentLibrarySection />
      
      {/* Separator between existing app and GPT Bypass */}
      <div className="my-12">
        <Separator className="my-8" />
        <div className="text-center text-sm text-muted-foreground">
          New Feature Below
        </div>
        <Separator className="my-8" />
      </div>
      
      {/* GPT Bypass Section */}
      <GPTBypassSection />
    </>
  );
};

export default Home;
