import { NextResponse } from 'next/server';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Store bot processes globally to track them
declare global {
  var botProcessMap: Map<string, number> | undefined;
}

if (!global.botProcessMap) {
  global.botProcessMap = new Map();
}

// Helper to kill bot processes by port
async function killBotByPort(port: number): Promise<{ killed: boolean; message: string }> {
  try {
    // Find and kill processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || true`);
    const pids = stdout.trim().split('\n').filter(Boolean);

    if (pids.length === 0) {
      return { killed: false, message: 'No process found on port' };
    }

    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid.trim()} 2>/dev/null || true`);
      } catch {
        // Ignore errors killing individual PIDs
      }
    }

    // Wait a moment for processes to die
    await new Promise((r) => setTimeout(r, 1000));

    return { killed: true, message: `Killed ${pids.length} process(es)` };
  } catch (error) {
    return { killed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

// GET - Check bot status and spawn if not running
export async function GET() {
  const results = {
    whatsapp: { running: false, port: 6002 },
    discord: { running: false, port: 6003 },
  };

  // Check WhatsApp bot
  try {
    const waRes = await fetch('http://localhost:6002/', {
      signal: AbortSignal.timeout(3000),
    });
    if (waRes.ok) {
      results.whatsapp.running = true;
    }
  } catch {
    results.whatsapp.running = false;
  }

  // Check Discord bot
  try {
    const dcRes = await fetch('http://localhost:6003/', {
      signal: AbortSignal.timeout(3000),
    });
    if (dcRes.ok) {
      results.discord.running = true;
    }
  } catch {
    results.discord.running = false;
  }

  return NextResponse.json(results);
}

// DELETE - Stop/kill bots
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { bot } = body as { bot: 'whatsapp' | 'discord' | 'all' };

    const results: Record<string, { success: boolean; message: string }> = {};

    const stopBot = async (botType: 'whatsapp' | 'discord') => {
      const port = botType === 'whatsapp' ? 6002 : 6003;
      const result = await killBotByPort(port);
      return { success: result.killed, message: result.message };
    };

    if (bot === 'whatsapp' || bot === 'all') {
      results.whatsapp = await stopBot('whatsapp');
    }

    if (bot === 'discord' || bot === 'all') {
      results.discord = await stopBot('discord');
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Start or restart bots
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bot, restart } = body as { bot: 'whatsapp' | 'discord' | 'all'; restart?: boolean };

    const results: Record<string, { success: boolean; message: string }> = {};

    const startBot = async (botType: 'whatsapp' | 'discord', shouldRestart: boolean) => {
      const port = botType === 'whatsapp' ? 6002 : 6003;
      const botDir = `/home/z/my-project/mini-services/${botType === 'whatsapp' ? 'whatsapp-bot' : 'discord-bot'}`;

      // If restart requested, kill existing process first
      if (shouldRestart) {
        await killBotByPort(port);
        // Wait for port to be freed
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        // Check if already running (for start-only mode)
        try {
          const res = await fetch(`http://localhost:${port}/`, {
            signal: AbortSignal.timeout(2000),
          });
          if (res.ok) {
            return { success: true, message: 'Already running' };
          }
        } catch {
          // Not running, proceed to start
        }
      }

      // Start using Node spawn in background
      try {
        const proc = spawn('bun', ['index.ts'], {
          cwd: botDir,
          detached: true,
          stdio: 'ignore',
          shell: true,
        });

        // Detach to let it run independently
        proc.unref();

        // Store PID
        global.botProcessMap?.set(botType, proc.pid || 0);

        // Wait a moment and verify
        await new Promise((r) => setTimeout(r, 5000));

        try {
          const verify = await fetch(`http://localhost:${port}/`, {
            signal: AbortSignal.timeout(3000),
          });
          if (verify.ok) {
            return { success: true, message: `Started successfully (PID: ${proc.pid})` };
          }
        } catch {
          // Still not responding
        }

        return { success: true, message: `Process started (PID: ${proc.pid}), initializing...` };
      } catch (err) {
        return { success: false, message: `Failed to start: ${err instanceof Error ? err.message : 'Unknown error'}` };
      }
    };

    if (bot === 'whatsapp' || bot === 'all') {
      results.whatsapp = await startBot('whatsapp', restart === true);
    }

    if (bot === 'discord' || bot === 'all') {
      results.discord = await startBot('discord', restart === true);
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
