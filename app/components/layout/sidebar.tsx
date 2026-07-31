"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, ClipboardList, Tag, Columns, Settings2, Globe, 
  Image as ImageIcon, HelpCircle, MessageSquare, Bot, GitMerge, 
  Folder, CheckCircle, Settings, Book, Code, Phone, Users, Smartphone,
  Megaphone, Calendar
} from 'lucide-react';

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  
  const menuGroups = [
    {
      title: "MAIN",
      items: [
        { name: "Contacts", icon: Users, href: "/contacts" },
        { name: "Inbox", icon: MessageSquare, href: "/inbox" },
        { name: "Broadcasts", icon: Megaphone, href: "/broadcasts" },
        { name: "Schedule", icon: Calendar, href: "/schedule" },
      ]
    },
    {
      title: "WHATSAPP",
      items: [
        { name: "Whatsapp Templates", icon: FileText, href: "/templates" },
        { name: "Whatsapp Forms", icon: ClipboardList, href: "/forms" },
        { name: "Conversational Components", icon: Smartphone, href: "/conversational-components" },
      ]
    },
    {
      title: "MANAGEMENT",
      items: [
        { name: "Tags", icon: Tag, href: "/tags" },
        { name: "Columns", icon: Columns, href: "/columns" },
        { name: "Opts Management", icon: Settings2, href: "/opts" },
      ]
    },
    {
      title: "TOOLS",
      items: [
        { name: "Webhook Events", icon: Globe, href: "/webhooks" },
        { name: "Gallery", icon: ImageIcon, href: "/gallery" },
        { name: "FAQ Bot", icon: HelpCircle, href: "/faq" },
        { name: "Chatbot", icon: MessageSquare, href: "https://avani-loan-agents.vercel.app/dashboard", external: true },
        { name: "Ai assistant", icon: Bot, href: "/assistant" },
        { name: "Flows", icon: GitMerge, href: "/flows" },
      ]
    },
    {
      title: "WORKSPACE",
      items: [
        { name: "Projects", icon: Folder, href: "/projects" },
        { name: "Tasks", icon: CheckCircle, href: "/tasks" },
        { name: "Settings", icon: Settings, href: "/settings" },
        { name: "Knowledge Base", icon: Book, href: "/knowledge" },
        { name: "Developers", icon: Code, href: "/developers" },
        { name: "Operations Guide", icon: Book, href: "/guide" },
      ]
    }
  ];

  return (
    <div className={`flex h-screen w-64 flex-col border-r border-zinc-800 bg-sidebar text-sidebar-foreground shrink-0 ${className}`}>
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Avani Loan Service" className="h-10 w-auto filter drop-shadow-md brightness-110" />
        </div>
      <div className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <nav className="flex flex-col gap-1 px-3">
          {menuGroups.map((group, i) => (
            <div key={i} className="mb-4">
              <h3 className="px-3 text-xs font-semibold text-zinc-500 mb-2">{group.title}</h3>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.name}
                      href={item.href} 
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground font-medium' 
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-zinc-500'}`} />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center font-bold text-xs text-white">
            SS
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">Sachin Shinde</span>
            <span className="text-xs text-zinc-500 truncate">enquiry@avanifinserv.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
