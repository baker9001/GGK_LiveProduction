import React from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "IGCSE Student",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
    content: "GGK Learning helped me achieve A* grades in Mathematics and Physics. The interactive lessons and practice exams were incredibly helpful!",
    rating: 5,
    subject: "Mathematics & Physics"
  },
  {
    name: "Ahmed Al-Rashid",
    role: "IGCSE Student",
    image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg",
    content: "The chemistry section is amazing! The visual explanations and step-by-step solutions made complex topics easy to understand.",
    rating: 5,
    subject: "Chemistry"
  },
  {
    name: "Emma Thompson",
    role: "Parent",
    image: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg",
    content: "As a parent, I love being able to track my daughter's progress. The platform provides excellent insights into her learning journey.",
    rating: 5,
    subject: "Parent Portal"
  }
];

export default function TestimonialsSection() {
  return (
    <div className="py-24 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">What Our Students Say</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Real success stories from IGCSE students and parents
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 shadow-sm dark:shadow-gray-900/20 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200"
            >
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <div className="relative mb-6">
                <Quote className="absolute -top-2 -left-2 h-8 w-8 text-[#8CC63F] opacity-20" />
                <p className="text-gray-700 dark:text-gray-300 italic pl-6">
                  "{testimonial.content}"
                </p>
              </div>
              
              <div className="flex items-center">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                  <p className="text-xs text-[#8CC63F] font-medium">
                    {testimonial.subject}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}