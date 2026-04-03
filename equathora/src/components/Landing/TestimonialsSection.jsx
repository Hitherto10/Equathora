import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Aashrun from "../../assets/images/aashrun.jpg";


const TestimonialsSection = () => {
    const testimonials = [
        {
            image: Aashrun,
            name: "Aashrun Gautam",
            role: "Founder of SleepLeads - Reddit \"High-Intent\" Lead SaaS",
            text: (
                <>
                    It’s actually <span className='font-bold'>well-designed</span>. <br />And it lets you practice math{" "}
                    <span className='font-bold'>chapter by chapter</span>, with a <span className=''>HUGE database of questions</span>{" "}
                    without wanting to throw your laptop out the window.
                </>
            )
        }
    ]
    return (
        <>
            <hr />
            <section className='flex justify-center text-[var(--secondary-color)] font-[Sansation,Arial]'>
                <div className='max-w-[1400px] mx-auto w-full bg-white relative overflow-hidden flex justify-center px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-12 sm:py-16 md:py-20 lg:py-24 gap-10'>
                    <div className='flex flex-col w-1/2 pr-36'>
                        <h2 className='text-3xl sm:text-3xl md:text-4xl lg:text-4xl text-[var(--secondary-color)] pb-2 font-extrabold'>From our <br /><span className='font-black'>community.</span></h2>
                        <p className='text-[var(--secondary-color)] font-light text-sm sm:text-base'>What students say before and after Equathora are two different stories.</p>
                    </div>
                    <div className='w-1/2 flex'>
                        {testimonials.map((item, index) => (
                            <div key={index} className='flex flex-col gap-6'>
                                <p className='text-3xl sm:text-3xl md:text-4xl lg:text-4xl max-w-3xl font-light'>{item.text}</p>
                                <div className='flex gap-3 items-center'>
                                    <img src={item.image} alt="profile picture" className='
                                    rounded-full w-16 h-16'/>
                                    <div className="flex flex-col">
                                        <p className='text-lg sm:text-xl font-bold text-[var(--secondary-color)]'>{item.name}</p>
                                        <p className='text-[var(--secondary-color)] font-light text-sm sm:text-base'>{item.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <hr />
        </>
    );
};

export default TestimonialsSection;
