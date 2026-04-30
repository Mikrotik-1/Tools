(function(){

if(window.MikroChat) return;

function createChat(){

  if(document.getElementById("chat")) return document.getElementById("chat");

  let chat=document.createElement("div");

  chat.id="chat";

  chat.style=`
    position:fixed;
    right:120px;
    bottom:20px;
    width:300px;
    height:380px;
    background:#fff;
    border-radius:15px;
    box-shadow:0 10px 30px rgba(0,0,0,.3);
    z-index:999999;
    display:none;
    flex-direction:column;
    overflow:hidden;
  `;

  chat.innerHTML=`
    <div style="background:#6366f1;color:white;padding:10px;text-align:center">
      🤖 مساعد الشبكات
    </div>

    <div id="msgs" style="flex:1;padding:10px;overflow:auto;font-size:13px">
      👋 أهلاً بيك
    </div>

    <div style="display:flex;border-top:1px solid #ddd">
      <input id="input" placeholder="اكتب..."
      style="flex:1;border:none;padding:8px">

      <button onclick="sendMsg()" style="background:#6366f1;color:white;border:none;padding:8px">
      ➤
      </button>
    </div>
  `;

  document.body.appendChild(chat);
  return chat;
}

window.sendMsg=function(){
  let input=document.getElementById("input");
  let msg=input.value.trim();
  if(!msg) return;

  let box=document.getElementById("msgs");

  box.innerHTML+=`<div>👤 ${msg}</div>`;

  let reply="جاري التحليل...";

  if(msg.includes("نت")) reply="راجع DNS و /ping 8.8.8.8";
  if(msg.includes("هوت")) reply="راجع hotspot profile";
  if(msg.includes("سرعة")) reply="راجع Queue";

  setTimeout(()=>{
    box.innerHTML+=`<div>🤖 ${reply}</div>`;
    box.scrollTop=box.scrollHeight;
  },500);

  input.value="";
}

window.MikroChat={
  open:function(){
    let chat=createChat();
    chat.style.display="flex";
  }
}

})();