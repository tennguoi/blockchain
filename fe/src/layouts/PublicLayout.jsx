import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedMeshBackground from '../components/AnimatedMeshBackground';
import AnimatedOutlet from '../components/AnimatedOutlet';

const PublicLayout = () => {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50">
      <AnimatedMeshBackground />
      <Navbar />
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <AnimatedOutlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
