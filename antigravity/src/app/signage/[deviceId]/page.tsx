import SignagePlayer from '@/components/signage/SignagePlayer';

type Params = Promise<{ deviceId: string }>;

export default async function SignagePage({ params }: { params: Params }) {
    const { deviceId } = await params;

    return (
        <main className="w-screen h-screen overflow-hidden bg-black">
            <SignagePlayer deviceId={deviceId} />
        </main>
    );
}
