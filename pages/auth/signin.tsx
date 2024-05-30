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
          <div className="flex w-screen p-10" style={{ backgroundImage: `url(${loginBackground.src})`, width: '100%', height: '100%', backgroundSize: 'cover' }}>
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
          <div className="hidden md:flex flex-shrink-0 flex-col items-end mb-2">
            <div className="ml-2 group relative flex flex-row text-white">
              How Do I Get Access?
              <span className="tooltip absolute bg-gray-700 text-white text-center py-2 px-3 w-[255px] rounded-lg text-sm bottom-full right-0 transform translate-x-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300">
                Currently MSF AI Assistant is only available to USA and OCA staff.<br /><br />
                We hope to expand soon!
              </span>
            </div>
          </div>
          <div className="text-gray-500">v{version}.{build}.{env}</div>
          <div className="text-gray-500">{email}</div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // @ts-ignore
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