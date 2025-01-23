'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { IconPhotoPlus, IconPhotoShield } from '@tabler/icons-react';
import Link from 'next/link';

export default function NavBar () {
  const pathname = usePathname();
  const showButton = ['/secure-image', '/retrieve-image'].includes(pathname);

  return (
    <nav className='w-full bg-cyan-950 px-4 py-3'>
      <div className='max-w-7xl mx-auto flex justify-between items-center px-3 md:px-0'>
        <Link href='/'>
          <div className='flex items-center space-x-2 cursor-pointer'>
            <IconPhotoShield className='text-cyan-50 h-8 w-8'/>
            <span className='text-cyan-50 text-xl font-semibold font-raleway'>
              SecureVision
            </span>
          </div>
        </Link>

        {showButton && (
          <button className='bg-teal-600 hover:bg-teal-500 transition-colors duration-200 text-white px-4 py-2 rounded-full flex items-center space-x-2 font-lato'>
            <IconPhotoPlus className='h-5 w-5'/>
            <span className='hidden sm:inline sm:pl-1 sm:text-base font-medium'>New Conversion</span>
          </button>
        )}
      </div>
    </nav>
  );
};
