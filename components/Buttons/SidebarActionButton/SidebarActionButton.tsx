import { MouseEventHandler, ReactElement } from 'react';

interface Props {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactElement;
  tooltipText: string;
}

const SidebarActionButton = ({ handleClick, children, tooltipText}: Props) => (
  <div className="group">
  <button
    className="relative min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100"
    onClick={handleClick}
  >
    {children}
    <div className="absolute transform -translate-x-1/2 top-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md">
        {tooltipText}
    </div> 
  </button>
  </div>
);

export default SidebarActionButton;
