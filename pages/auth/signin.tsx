import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getProviders, signIn } from "next-auth/react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]";
import Image from 'next/image'
import azure from '../../public/azure.png'
import logo from '../../public/logo_light.png'
import loginBackground from '../../public/loginBackground.jpg'

const version = process.env.NEXT_PUBLIC_VERSION;
const build = process.env.NEXT_PUBLIC_BUILD;
const env = process.env.NEXT_PUBLIC_ENV;
const email = process.env.NEXT_PUBLIC_EMAIL;

export default function SignIn({ providers }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <div className="h-screen overflow-hidden md:flex">
      <div className="md:h-screen w-screen bg-zinc-900">
      <div className="flex w-screen p-10" style={{ backgroundImage: `url(${loginBackground.src})`, width: '100%', height: '100%', backgroundSize: 'cover'}}>
          <div>
              <Image
                      src={logo}
                      alt="MSF Logo"
                  />
          </div>
          <h1 className="text-4xl font-thin text-white px-5 mt-3">MSF AI Assistant</h1>
      </div>
      </div>
      {Object.values(providers).map((provider) => (
        <div key={provider.name} className="flex items-center justify-center h-full md:w-3/4">
            <div className="flex flex-row mb-80 md:mb-0 sm:mb-40 bg-zinc-950 hover:bg-zinc-800 text-white py-4 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <Image
            src={azure}
            alt="Active Directory Logo"
            width="25"
            />
            <button
               className="px-3"
                onClick={() => signIn(provider.id)}
            >
                Sign in with {provider.name}
            </button>
            </div>
        </div>
      ))}
    </div>
    <div className="fixed bottom-0 right-0 w-full py-1">
        <div className="flex flex-col items-end px-1">
          <div className="text-gray-500">v{version}.{build}.{env}</div>
          <div className="text-gray-500">{email}</div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  // If the user is already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  if (session) {
    return { redirect: { destination: "/" } };
  }

  const providers = await getProviders();

  return {
    props: { providers: providers ?? [] },
  }
}