import { Users, Code, MessageSquare, Trophy, ArrowRight } from "lucide-react"
import Header from "../../components/Header/Header"
import LandingScreenshot from "../../assets/landing.png"
import Logo from "../../assets/octopus.svg"
import Button from "../../components/Button/Button"
import CardContent from "../../components/Card/CardContent"
import Card from "../../components/Card/Card"
import { FaGithub } from "react-icons/fa"
import { useNavigate } from "react-router-dom"

function Landing() {
  const companies = [
    "Google",
    "Meta",
    "Amazon",
    "Apple",
    "Microsoft",
    "Netflix",
    "Uber",
    "Airbnb",
    "Spotify",
    "Tesla",
    "Adobe",
    "Salesforce",
  ];

  const navigate = useNavigate();

  const handleGetStartedClick = () => {
    if (localStorage.getItem("token")) {
      navigate("/home");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-purple-50"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Code Together,
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">
                  {" "}
                  Grow Together
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-600 mb-10 leading-relaxed">
                Prepare for techincal interviews socially. Join coding rooms, solve algorithmic
                problems together, and accelerate your programming journey today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg shadow-xl"
                  onClick={handleGetStartedClick}
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-600 mb-8 font-medium">Trusted by developers from</p>
            <div className="relative overflow-hidden">
              <div className="flex animate-scroll gap-12 items-center">
                {[...companies, ...companies].map((company, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 text-2xl font-bold text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    {company}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Product Screenshot */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">See octree.io in Action</h2>
              <p className="text-xl text-gray-600">Experience collaborative coding like never before</p>
            </div>

            {/* Mac Browser Frame */}
            <div className="relative">
              <div className="bg-gray-100 rounded-t-xl p-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1 bg-white rounded-md mx-4 px-4 py-1 text-sm text-gray-500">
                    octree.io/room/why-so-serious
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-b-xl shadow-2xl min-h-[400px] flex items-center justify-center">
                <img src={LandingScreenshot} />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Everything You Need to Excel</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Powerful features designed to make collaborative coding seamless and effective
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Real-time Collaboration</h3>
                  <p className="text-gray-600">
                    Code together in real-time with friends. See changes instantly and work as a team.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Code className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Multi-Language Support</h3>
                  <p className="text-gray-600">
                    Support for Python, JavaScript, Java, C++, and more. Choose your preferred language.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Integrated Chat</h3>
                  <p className="text-gray-600">
                    Discuss solutions, share insights, and learn from each other with built-in chat.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Progress Tracking</h3>
                  <p className="text-gray-600">
                    Track your progress, see solutions, and measure improvement over time.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How octree.io Works</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get started in minutes and begin your collaborative coding journey
              </p>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-mono text-lg font-bold">
                  0001
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create or Join Room</h3>
                <p className="text-gray-600">Start a new coding session or join an existing room with your friends.</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-mono text-lg font-bold">
                  0010
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Select a Language</h3>
                <p className="text-gray-600">
                  You can select up to 7 different languages. We support Python, C++, Java, C#, Ruby, JavaScript and TypeScript. More coming in the future!
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-mono text-lg font-bold">
                  0011
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Solve Problems</h3>
                <p className="text-gray-600">
                  You can chat and solve problems together. Soon solutions will be shown at the end of each round.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-mono text-lg font-bold">
                  0100
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Learn & Grow</h3>
                <p className="text-gray-600">
                  Review solutions, track progress, and improve your coding skills together.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-br from-purple-600 to-purple-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Transform Your Coding Journey?</h2>
            <p className="text-xl text-purple-100 mb-10">
              Join thousands of developers who are already coding together and growing faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" textColor="text-purple-600" className="bg-white hover:bg-gray-100 hover:text-white px-8 py-4 text-lg font-semibold" onClick={handleGetStartedClick}>
                Start Coding Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex">
                <img className="landing-footer-logo-image" src={Logo} width={32} alt="Logo" />
                <h3 className="text-lg font-bold ml-1">octree<span className="text-[#9266cc]">.io</span><sup>BETA</sup></h3>
              </div>
              <p className="text-gray-600 mb-6 max-w-md">
                The social coding platform that helps developers learn, practice, and grow together.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://github.com/octree-io"
                  target="_blank"
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                >
                  <FaGithub className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <div className="space-y-3">
                <a href="#" className="block text-gray-600 hover:text-purple-600 transition-colors">
                  Contact Us
                </a>
                <a href="#" className="block text-gray-600 hover:text-purple-600 transition-colors">
                  Support
                </a>
              </div>
            </div>

            {/* Terms Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Terms</h4>
              <div className="space-y-3">
                <a href="#" className="block text-gray-600 hover:text-purple-600 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="block text-gray-600 hover:text-purple-600 transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8">
            <p className="text-center text-gray-500">
              © 2025 octree.io. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing;
