import DictationSectionFixed from "@/components/DictationSectionFixed";
import DocumentDropzone from "@/components/DocumentDropzone";
import StyleLibrarySection from "@/components/StyleLibrarySection";
import ContentLibrarySection from "@/components/ContentLibrarySection";

const Home = () => {
  return (
    <>
      <DictationSectionFixed />
      <DocumentDropzone />
      <StyleLibrarySection />
      <ContentLibrarySection />
    </>
  );
};

export default Home;
