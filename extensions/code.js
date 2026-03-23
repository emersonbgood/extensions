(function (Scratch) {
  'use strict';

  class MasterVirtualOS {
    constructor() {
      this.storageKey = 'tw_master_vos_v8';
      const saved = localStorage.getItem(this.storageKey);
      this.fs = saved ? JSON.parse(saved) : { "/": { type: "dir", children: { "bin": { type: "dir", children: {} } } } };
      
      this.username = "user";
      this.terminalElement = null;
      this.currentCmd = "";
      this.currentArgs = ["", "", ""];
      this.argCount = 0;
    }

    save() { localStorage.setItem(this.storageKey, JSON.stringify(this.fs)); }

    _navigate(path) {
      const parts = path.split('/').filter(p => p);
      let current = this.fs["/"];
      for (const part of parts) {
        if (!current || !current.children || !current.children[part]) return null;
        current = current.children[part];
      }
      return current;
    }

    getInfo() {
      return {
        id: 'mastervos',
        name: 'Master Virtual OS',
        color1: '#1a1a1a',
        blocks: [
          {
            opcode: 'onCommandHat',
            blockType: Scratch.BlockType.HAT,
            text: 'when command [NAME] runs',
            arguments: { NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'hello' } }
          },
          {
            opcode: 'getArg',
            blockType: Scratch.BlockType.REPORTER,
            text: 'input [NUM]',
            arguments: { NUM: { type: Scratch.ArgumentType.NUMBER, menu: 'argMenu' } }
          },
          {
            opcode: 'getArgCount',
            blockType: Scratch.BlockType.REPORTER,
            text: 'input count'
          },
          "---", // Terminal Section
          {
            opcode: 'toggleTerminal',
            blockType: Scratch.BlockType.COMMAND,
            text: 'terminal [STATE]',
            arguments: { STATE: { type: Scratch.ArgumentType.STRING, menu: 'stateMenu' } }
          },
          {
            opcode: 'print',
            blockType: Scratch.BlockType.COMMAND,
            text: 'print [TEXT] to terminal',
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Done.' } }
          },
          {
            opcode: 'clearTerminal',
            blockType: Scratch.BlockType.COMMAND,
            text: 'clear terminal'
          },
          "---", // Filesystem Section
          {
            opcode: 'writeFile',
            blockType: Scratch.BlockType.COMMAND,
            text: 'write [DATA] to [NAME] in [PATH]',
            arguments: {
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: 'run hello $1' },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'greet' },
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: '/bin' }
            }
          },
          {
            opcode: 'createDir',
            blockType: Scratch.BlockType.COMMAND,
            text: 'create folder [NAME] in [PATH]',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'docs' },
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: '/' }
            }
          },
          {
            opcode: 'listItems',
            blockType: Scratch.BlockType.REPORTER,
            text: 'list items in [PATH]',
            arguments: { PATH: { type: Scratch.ArgumentType.STRING, defaultValue: '/' } }
          },
          {
            opcode: 'deleteItem',
            blockType: Scratch.BlockType.COMMAND,
            text: 'delete [NAME] in [PATH]',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'file.txt' },
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: '/' }
            }
          },
          {
            opcode: 'readFile',
            blockType: Scratch.BlockType.REPORTER,
            text: 'read file [NAME] in [PATH]',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'greet' },
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: '/bin' }
            }
          }
        ],
        menus: {
          stateMenu: { acceptReporters: true, items: ['visible', 'hidden'] },
          argMenu: { acceptReporters: true, items: ['1', '2', '3'] }
        }
      };
    }

    onCommandHat(args) {
      return args.NAME === this.currentCmd;
    }

    getArg({ NUM }) {
      return this.currentArgs[parseInt(NUM) - 1] || "";
    }

    getArgCount() {
      return this.argCount;
    }

    _executeCommand(input) {
      const parts = input.split(' ');
      const typedCmd = parts[0];
      const userInputs = parts.slice(1);

      const bin = this._navigate('/bin');
      if (bin && bin.children[typedCmd] && bin.children[typedCmd].type === 'file') {
        let content = bin.children[typedCmd].content;
        
        if (content.startsWith('run ')) {
          const words = content.split(' ');
          this.currentCmd = words[1]; 
          
          this.currentArgs = [
            userInputs[0] || "",
            userInputs[1] || "",
            userInputs[2] || ""
          ];
          this.argCount = userInputs.length;

          Scratch.vm.runtime.startHats('mastervos_onCommandHat');
          setTimeout(() => { this.currentCmd = ""; }, 100);
        }
      } else {
        this.print({ TEXT: `sh: ${typedCmd}: command not found` });
      }
    }

    _setupTerminal() {
      if (this.terminalElement) return;
      const container = document.createElement('div');
      container.style = "position:absolute; top:10px; left:10px; width:440px; height:300px; background:rgba(0,0,0,0.9); color:#00FF41; font-family:monospace; padding:10px; border-radius:8px; z-index:1000; display:flex; flex-direction:column; border:1px solid #444;";
      const output = document.createElement('div');
      output.style = "flex:1; overflow-y:auto; margin-bottom:5px; white-space:pre-wrap;";
      output.innerText = "MASTER OS V8 ONLINE\n";
      const inputLine = document.createElement('div');
      inputLine.style = "display:flex;";
      const prefix = document.createElement('span');
      prefix.innerText = `${this.username}:~$ `;
      const input = document.createElement('input');
      input.style = "background:transparent; border:none; color:#00FF41; outline:none; flex:1; font-family:monospace;";
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = input.value.trim();
          this.print({ TEXT: `${this.username}:~$ ${val}` });
          if (val) this._executeCommand(val);
          input.value = '';
        }
      });
      inputLine.appendChild(prefix);
      inputLine.appendChild(input);
      container.appendChild(output);
      container.appendChild(inputLine);
      document.body.appendChild(container);
      this.terminalElement = container;
      this.terminalOutput = output;
      this.terminalInput = input;
    }

    clearTerminal() { if (this.terminalOutput) this.terminalOutput.innerText = ""; }
    toggleTerminal({ STATE }) {
      this._setupTerminal();
      this.terminalElement.style.display = (STATE === 'visible') ? 'flex' : 'none';
      if (STATE === 'visible') this.terminalInput.focus();
    }
    print({ TEXT }) {
      if (!this.terminalOutput) this._setupTerminal();
      this.terminalOutput.innerText += TEXT + "\n";
      this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }
    writeFile({ DATA, NAME, PATH }) {
      const parent = this._navigate(PATH);
      if (parent && parent.type === 'dir') {
        parent.children[NAME] = { type: 'file', content: String(DATA) };
        this.save();
      }
    }
    createDir({ NAME, PATH }) {
      const parent = this._navigate(PATH);
      if (parent && parent.type === 'dir') {
        parent.children[NAME] = { type: 'dir', children: {} };
        this.save();
      }
    }
    listItems({ PATH }) {
      const folder = this._navigate(PATH);
      return (folder && folder.type === 'dir') ? Object.keys(folder.children).join(', ') : "";
    }
    deleteItem({ NAME, PATH }) {
      const parent = this._navigate(PATH);
      if (parent && parent.children[NAME]) {
        delete parent.children[NAME];
        this.save();
      }
    }
    readFile({ NAME, PATH }) {
      const node = this._navigate(PATH + "/" + NAME);
      return (node && node.type === 'file') ? node.content : "";
    }
  }

  Scratch.extensions.register(new MasterVirtualOS());
})(Scratch);
