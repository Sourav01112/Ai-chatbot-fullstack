import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Zap, Shield, Star, ArrowRight, Sparkles } from 'lucide-react';
import heroImage from '@/assets/hero-bg.jpg';

export default function Landing() {
  const features = [
    {
      icon: MessageCircle,
      title: 'Multi-turn Conversations',
      description: 'Engage in natural, contextual conversations that maintain history and understanding.'
    },
    {
      icon: Zap,
      title: 'Advanced AI Models',
      description: 'Powered by cutting-edge AI technology for intelligent and helpful responses.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your conversations are protected with enterprise-grade security and privacy.'
    },
    {
      icon: Star,
      title: 'Customizable Preferences',
      description: 'Personalize your AI experience with custom personas and response settings.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">AI Chatbot</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/login" className="text-foreground hover:text-primary transition-colors">
                Login
              </Link>
              <Button asChild variant="hero" size="sm">
                <Link to="/register">Get Started</Link>
              </Button>
            </nav>
            <div className="md:hidden">
              <Button asChild variant="hero" size="sm">
                <Link to="/register">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 hero-gradient opacity-20" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Powered by Advanced AI</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-tight mb-6">
              <span className="gradient-text">AI Chatbot:</span>
              <br />
              Intelligent Conversations
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Experience the future of AI conversations with our advanced chatbot platform. 
              Get intelligent, context-aware responses powered by cutting-edge AI models.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="xl" className="animate-glow">
                <Link to="/register">
                  Start Chatting Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Why Choose Our AI Chatbot?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the features that make our platform the best choice for intelligent conversations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
              Ready to Experience Intelligent Conversations?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of users who are already having amazing conversations with our AI.
            </p>
            <Button asChild variant="hero" size="xl" className="glow-effect">
              <Link to="/register">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold gradient-text">AI Chatbot</span>
            </div>
            <nav className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </nav>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2024 AI Chatbot Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}