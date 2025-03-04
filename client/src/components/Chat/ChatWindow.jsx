import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import UserList from "./UserList";
import Message from "./Message";
import { useSocket } from "../../contexts/SocketContext";
import ContactDetails from "./ContactDetails";

const getInitials = (name) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ChatWindow = ({ user }) => {
  const storageKey = `messages_${user.id}`;
  const lastReadKey = `lastRead_${user.id}`;
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [lastReadTimestamps, setLastReadTimestamps] = useState(() => {
    const saved = localStorage.getItem(lastReadKey);
    return saved ? JSON.parse(saved) : {};
  });
  const [showContactDetails, setShowContactDetails] = useState(false);

  const { socket, onlineUsers } = useSocket();
  const prevActiveRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeContactRef = useRef(activeContact);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, activeContact]);

  useEffect(() => {
    if (user.id) {
      axios
        .get(`http://localhost:5001/api/messages?userId=${user.id}`)
        .then((res) => {
          const fetchedMessages = res.data.reduce((acc, message) => {
            const contactId =
              message.sender === user.id ? message.receiver : message.sender;
            if (!acc[contactId]) acc[contactId] = [];
            acc[contactId].push(message);
            return acc;
          }, {});
          setMessages(fetchedMessages);
          localStorage.setItem(storageKey, JSON.stringify(fetchedMessages));
        })
        .catch((err) => console.error(err));
    }
  }, [user.id, storageKey]);

  useEffect(() => {
    if (searchQuery.trim()) {
      axios
        .get(`http://localhost:5001/api/search?query=${searchQuery}`)
        .then((res) => {
          const results = res.data.filter((u) => u._id !== user.id);
          setSearchResults(results);
        })
        .catch((err) => console.error(err));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, user.id]);

  const fetchUserDetails = useCallback(async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/user/${userId}`);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch user details", err);
      return null;
    }
  }, []);

  const updateContactDetails = useCallback(
    async (contactId) => {
      const details = await fetchUserDetails(contactId);
      if (details) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  id: details._id,
                  name: details.name,
                  email: details.email,
                  phone: details.mobile,
                  temporary: false,
                }
              : c
          )
        );
        if (
          activeContactRef.current &&
          activeContactRef.current.id === contactId
        ) {
          setActiveContact({
            ...activeContactRef.current,
            id: details._id,
            name: details.name,
            email: details.email,
            phone: details.phone,
            temporary: false,
          });
        }
      }
    },
    [fetchUserDetails]
  );

  const handleReceiveMessage = useCallback(
    (message) => {
      const contactId =
        message.sender === user.id ? message.receiver : message.sender;

      setMessages((prev) => {
        const updated = { ...prev };
        if (!updated[contactId]) updated[contactId] = [];
        const exists = updated[contactId].some(
          (msg) => msg._id === message._id
        );
        if (!exists) {
          updated[contactId].push(message);
        }
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });

      if (
        activeContactRef.current &&
        activeContactRef.current.id === contactId &&
        message.sender !== user.id
      ) {
        setLastReadTimestamps((prev) => {
          const updated = { ...prev, [contactId]: message.timestamp };
          localStorage.setItem(lastReadKey, JSON.stringify(updated));
          return updated;
        });
      }

      setContacts((prev) => {
        let newContacts = [...prev];
        const index = newContacts.findIndex((c) => c.id === contactId);
        if (index !== -1) {
          if (
            (!activeContactRef.current ||
              activeContactRef.current.id !== contactId) &&
            message.sender !== user.id
          ) {
            newContacts[index].unreadCount =
              (newContacts[index].unreadCount || 0) + 1;
          }
          newContacts[index].lastMessage = message.content;
          newContacts[index].lastMessageTime = message.timestamp;
          const [contact] = newContacts.splice(index, 1);
          newContacts.unshift(contact);
        } else {
          newContacts.unshift({
            id: contactId,
            name: contactId,
            email: "",
            temporary: false,
            unreadCount:
              (!activeContactRef.current ||
                activeContactRef.current.id !== contactId) &&
              message.sender !== user.id
                ? 1
                : 0,
            lastMessage: message.content,
            lastMessageTime: message.timestamp,
          });
        }
        return newContacts;
      });
    },
    [user.id, storageKey, lastReadKey]
  );

  useEffect(() => {
    if (socket) {
      socket.on("receive_message", handleReceiveMessage);
      return () => {
        socket.off("receive_message", handleReceiveMessage);
      };
    }
  }, [socket, handleReceiveMessage]);

  useEffect(() => {
    if (socket && user.id) {
      socket.emit("user_connected", user.id);
    }
  }, [socket, user.id]);

  useEffect(() => {
    if (
      prevActiveRef.current &&
      activeContact &&
      prevActiveRef.current.id !== activeContact.id
    ) {
      const prev = prevActiveRef.current;
      if (
        prev.temporary &&
        (!messages[prev.id] || messages[prev.id].length === 0)
      ) {
        setContacts((prevContacts) =>
          prevContacts.filter((c) => c.id !== prev.id)
        );
      }
    }
    prevActiveRef.current = activeContact;
  }, [activeContact, messages]);

  useEffect(() => {
    const contactIds = Object.keys(messages);
    setContacts((prev) => {
      const newContacts = contactIds.map((id) => {
        const existing = prev.find((c) => c.id === id);
        const msgs = messages[id];
        const lastMsg = msgs[msgs.length - 1];
        const unreadCount = lastReadTimestamps[id]
          ? msgs.filter(
              (msg) =>
                msg.sender !== user.id &&
                new Date(msg.timestamp) > new Date(lastReadTimestamps[id])
            ).length
          : msgs.filter((msg) => msg.sender !== user.id).length;
        return {
          id,
          name: existing ? existing.name : id,
          email: existing ? existing.email : "",
          phone: existing ? existing.phone : "",
          temporary: existing ? existing.temporary : false,
          unreadCount,
          lastMessage: lastMsg.content,
          lastMessageTime: lastMsg.timestamp,
        };
      });
      newContacts.sort(
        (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );
      return newContacts;
    });
  }, [messages, lastReadTimestamps, user.id]);

  useEffect(() => {
    Object.keys(messages).forEach((contactId) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact || contact.name === contactId) {
        updateContactDetails(contactId);
      }
    });
  }, [messages, contacts, updateContactDetails]);

  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    const latestMessageTimestamp =
      messages[contact.id] && messages[contact.id].length > 0
        ? messages[contact.id][messages[contact.id].length - 1].timestamp
        : new Date().toISOString();
    setLastReadTimestamps((prev) => {
      const updated = { ...prev, [contact.id]: latestMessageTimestamp };
      localStorage.setItem(lastReadKey, JSON.stringify(updated));
      return updated;
    });
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const handleSend = () => {
    if (activeContact && input.trim()) {
      const message = {
        sender: user.id,
        receiver: activeContact.id,
        content: input,
        timestamp: new Date().toISOString(),
      };
      socket.emit("send_message", message);
      setInput("");
    }
  };

  const groupedMessages = useMemo(() => {
    if (!activeContact) return [];
    const msgs = messages[activeContact.id] || [];
    if (!msgs || msgs.length === 0) return [];
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    const groups = [];
    let lastDate = "";
    sorted.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== lastDate) {
        groups.push({ date: msgDate, messages: [msg] });
        lastDate = msgDate;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  }, [messages, activeContact]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-[30%] flex flex-col bg-white relative border-r border-gray-300">
        <div className="p-4 flex items-center">
          <div className="flex items-center flex-1">
            <h2 className="text-2xl text-center flex items-center justify-center">
              <img
                src="src/assets/IMG_6731.jpg"
                alt="Logo"
                className="w-8 h-8 mr-2"
              />
              chat
            </h2>
          </div>
        </div>
        <div className="p-3 bg-white max-h-[56px] mb-[10px] mx-[8px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-h-[40px] pl-10 pr-3 py-2 bg-gray-50 rounded-[22px] focus:outline-none text-sm"
            />
            <div className="absolute left-3 top-2.5">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <UserList
          contacts={contacts}
          activeContact={activeContact}
          setActiveContact={handleSelectContact}
          onlineUsers={onlineUsers}
        />
        {searchResults.length > 0 && (
          <div className="absolute rounded-3xl w-full mt-33 shadow-lg z-10">
            {searchResults.map((contact) => (
              <div
                key={contact._id}
                className="flex items-center p-3 bg-gray-100 mb-2 rounded-2xl mx-2 hover:bg-gray-300 cursor-pointer"
                onClick={() => {
                  setContacts((prev) => {
                    let newContacts = [...prev];
                    const index = newContacts.findIndex(
                      (c) => c.id === contact._id
                    );
                    if (index !== -1) {
                      const [found] = newContacts.splice(index, 1);
                      newContacts.unshift(found);
                    } else {
                      newContacts.unshift({
                        id: contact._id,
                        name: contact.name,
                        email: contact.email,
                        temporary: true,
                        unreadCount: 0,
                        lastMessage: "",
                        lastMessageTime: new Date().toISOString(),
                      });
                    }
                    return newContacts;
                  });
                  setActiveContact({
                    id: contact._id,
                    name: contact.name,
                    email: contact.email,
                    temporary: true,
                  });
                  setSearchResults([]);
                  setSearchQuery("");
                }}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  {getInitials(contact.name) || "U"}
                </div>
                <div>
                  <div className="font-semibold text-sm">{contact.name}</div>
                  <div className="text-xs text-gray-500">{contact.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={showContactDetails ? "w-[60%] flex flex-col" : "flex-1 flex flex-col"}>
        {activeContact && (
          <div className="p-4 bg-gray-50 border-b border-gray-300 flex items-center">
            <div
              className="flex items-center flex-1 cursor-pointer"
              onClick={() => setShowContactDetails(true)}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  {activeContact.name ? getInitials(activeContact.name) : "U"}
                </div>
              </div>
              <div>
                <div className="font-semibold">{activeContact.name}</div>
              </div>
            </div>
            <div className="flex space-x-4">
              <button className="text-gray-600 hover:bg-gray-200 p-2 rounded-full">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                </svg>
              </button>
            </div>
          </div>
        )}
        {activeContact && (
          <div className="flex-1 overflow-y-auto scrollbar-hidden bg-[#F6F6F6] p-10 space-y-4">
            <div className="mx-auto max-w-[900px]">
              {groupedMessages.map((group, index) => (
                <div key={index}>
                  <div className="text-center my-4">
                    <span className="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-700">
                      {group.date === new Date().toDateString() ? "Today" : group.date}
                    </span>
                  </div>
                  {group.messages.map((msg) => (
                    <div
                      key={msg._id || msg.timestamp}
                      className={`w-full flex ${msg.sender === user.id ? "justify-end" : "justify-start"}`}
                    >
                      <Message message={msg} isOwn={msg.sender === user.id} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>
        )}
        {activeContact && (
          <div className="mb-4 bg-[#F6F6F6] px-10 max-w-full">
            <div className="mx-auto max-w-[937px] max-h-56 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="w-full h-[56px] pl-4 pr-12 rounded-[12px] bg-white focus:outline-none focus:border-green-500"
              />
              <button
                onClick={handleSend}
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
              >
                <svg
                  className="w-[24px] h-[24px] block"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 0 C2.56024301 1.06136712 4.86579803 2.13832541 7.28515625 3.44921875 C8.6972728 4.18461226 10.10972161 4.91936803 11.52246094 5.65356445 C12.25484985 6.03920563 12.98723877 6.4248468 13.74182129 6.82217407 C17.53503422 8.8006466 21.3730911 10.68797651 25.20703125 12.5859375 C26.78949607 13.3738867 28.37168734 14.1623855 29.95361328 14.95141602 C30.74834045 15.34773224 31.54306763 15.74404846 32.36187744 16.15237427 C55.59081627 27.74138794 55.59081627 27.74138794 66.76879883 33.70654297 C72.96253935 37.00706394 79.2372367 40.13317731 85.52392578 43.25219727 C92.02181394 46.48595641 98.44452299 49.84783973 104.85546875 53.25 C110.52964201 56.25121561 116.24990844 59.14724139 122 62 C129.34419315 65.64363071 136.61386782 69.4070277 143.85546875 73.25 C149.52964201 76.25121561 155.24990844 79.14724139 161 82 C168.34419315 85.64363071 175.61386782 89.4070277 182.85546875 93.25 C188.52964201 96.25121561 194.24990844 99.14724139 200 102 C207.34419315 105.64363071 214.61386782 109.4070277 221.85546875 113.25 C227.52964201 116.25121561 233.24990844 119.14724139 239 122 C246.34419315 125.64363071 253.61386782 129.4070277 260.85546875 133.25 C266.52964201 136.25121561 272.24990844 139.14724139 278 142 C285.34419315 145.64363071 292.61386782 149.4070277 299.85546875 153.25 C305.52964201 156.25121561 311.24990844 159.14724139 317 162 C324.34419315 165.64363071 331.61386782 169.4070277 338.85546875 173.25 C344.52964201 176.25121561 350.24990844 179.14724139 356 182 C363.34419315 185.64363071 370.61386782 189.4070277 377.85546875 193.25 C383.52964201 196.25121561 389.24990844 199.14724139 395 202 C402.34419315 205.64363071 409.61386782 209.4070277 416.85546875 213.25 C422.5296544 216.25122216 428.25011506 219.14680782 434 222 C443.07283142 226.50892228 452.08152752 231.12562046 461.00146484 235.93066406 C462.74791497 236.86511942 464.50770024 237.77456523 466.26953125 238.6796875 C471.08908716 241.2905743 474.36142586 243.59708168 476.4453125 248.796875 C478.02603528 255.07523872 477.90739594 261.40206183 474.54481506 267.07110596 C469.5749433 273.27660995 459.97097159 276.67010366 452.97265625 280.203125 C452.03901749 280.67826035 451.10537872 281.15339569 450.14344788 281.64292908 C447.1180786 283.18181751 444.09027318 284.71584759 441.0625 286.25 C437.86913483 287.87327088 434.67644318 289.49786143 431.48376465 291.1224823 C429.3470132 292.20965944 427.2100504 293.29642129 425.07287598 294.38276672 C416.07591588 298.95666396 407.09665811 303.56421957 398.125 308.1875 C395.32048962 309.63185457 392.51576589 311.07579434 389.7109375 312.51953125 C389.01222031 312.87919983 388.31350311 313.23886841 387.59361267 313.60943604 C378.65214512 318.21044525 369.70086835 322.7923146 360.75 327.375 C357.27864187 329.15233601 353.80728532 330.92967511 350.3359375 332.70703125 C349.04671387 333.36711182 349.04671387 333.36711182 347.73144531 334.04052734 C338.61068018 338.71071596 329.49260269 343.38614105 320.375 348.0625 C319.57453247 348.47304626 318.77406494 348.88359253 317.94934082 349.30657959 C313.91378684 351.37636271 309.87826985 353.44621793 305.84277344 355.51611328 C298.54190947 359.26084027 291.24069709 363.00488787 283.93951416 366.74899292 C279.8763288 368.83263471 275.81316551 370.91631951 271.75 373 C270.12500011 373.83333354 268.50000011 374.66666687 266.875 375.5 C266.070625 375.9125 265.26625 376.325 264.4375 376.75 C210 404.66666667 155.5625 432.58333333 101.125 460.5 C100.3206955 460.91246475 99.51639099 461.3249295 98.68771362 461.74989319 C97.06200451 462.58358834 95.43629243 463.41727771 93.81057739 464.2509613 C89.7589025 466.32871145 85.7072785 468.40656071 81.65576172 470.48461914 C74.2143111 474.30127734 66.77242558 478.11707823 59.32873535 481.92936707 C55.92825896 483.67095881 52.52798717 485.41294964 49.12780762 487.15512085 C47.4703804 488.00434717 45.81291028 488.85348976 44.15539551 489.70254517 C36.12603186 493.8163214 28.10039655 497.9364805 20.1015625 502.109375 C19.206082 502.57640587 19.206082 502.57640587 18.29251099 503.0528717 C15.58182146 504.46754971 12.87300326 505.88566955 10.16650391 507.30834961 C9.25046387 507.78796143 8.33442383 508.26757324 7.390625 508.76171875 C6.2154834 509.3798645 6.2154834 509.3798645 5.01660156 510.01049805 C-0.7275794 512.82904108 -6.73849357 512.53978504 -13 512 C-17.35447751 510.09014145 -20.16303434 507.5006437 -22.31056213 503.18040466 C-26.09090081 491.22476882 -20.84702841 476.80510308 -18.12890625 465.12109375 C-17.61303761 462.85631507 -17.09846002 460.59124199 -16.58508301 458.32589722 C-15.21048925 452.2754929 -13.81923599 446.22903561 -12.42470169 440.18320084 C-10.98410708 433.92476214 -9.55868158 427.66287461 -8.13256836 421.40112305 C-6.41016935 413.84173771 -4.6867338 406.28260064 -2.95655823 398.72499084 C0.53705473 383.46032641 3.98589113 368.18663893 7.375 352.8984375 C7.77668292 351.08848242 8.17838044 349.27853057 8.58009338 347.46858215 C10.06028449 340.79602759 11.53900937 334.12315764 13.00949097 327.44845581 C13.83799201 323.68840228 14.67125866 319.92943635 15.50813293 316.17123795 C15.94922129 314.18367665 16.38468766 312.19487026 16.81994629 310.20602417 C17.21059265 308.45529099 17.21059265 308.45529099 17.60913086 306.66918945 C17.83128769 305.6627388 18.05344452 304.65628815 18.28233337 303.61933899 C19.53655707 299.0416745 19.53655707 299.0416745 21 297 C23.39894347 296.22641873 25.48745053 295.74609651 27.95428467 295.35797119 C28.67899468 295.22952434 29.40370469 295.10107749 30.1503756 294.96873832 C32.59080681 294.54067205 35.03477952 294.13818876 37.47949219 293.73535156 C39.22805174 293.43399946 40.97634251 293.13108417 42.72438049 292.82672119 C47.49524148 292.0006234 52.2695907 291.19656143 57.04481792 290.39614582 C62.08238676 289.54786217 67.11645879 288.67931272 72.15093994 287.81292725 C81.74454222 286.16511129 91.34111785 284.53533189 100.9388926 282.91201568 C111.67165472 281.09594143 122.40120337 279.26125694 133.13040304 277.42427111 C146.29690416 275.17005222 159.46376358 272.91802193 172.63348389 270.68267822 C173.56607584 270.52431716 174.49866779 270.3659561 175.4595201 270.20279622 C182.99337795 268.92350975 182.99337795 268.92350975 186.56045294 268.31906557 C197.31840702 266.49573794 208.07032745 264.64199476 218.81555176 262.74499512 C220.94549101 262.37008255 223.07543606 261.995203 225.20538712 261.62035751 C229.27188498 260.90448693 233.33711569 260.18191194 237.4017601 259.45560074 C239.24438047 259.13062116 241.08704116 258.80587013 242.92974854 258.48138428 C243.76232005 258.33067396 244.59489156 258.17996364 245.45269251 258.02468634 C249.69362245 257.2838135 253.67387184 256.83537889 258 257 C258 256.34 258 255.68 258 255 C257.33171865 254.96067132 256.66343731 254.92134264 255.97490501 254.88082218 C246.84863452 254.241304 237.93290971 252.74847545 228.93603516 251.16772461 C227.24545449 250.87469264 225.55479349 250.58212377 223.86405945 250.28997803 C219.29282087 249.49876153 214.72272762 248.70110388 210.15281725 247.90225673 C205.31301609 247.05739408 200.47216956 246.21856278 195.63143921 245.37904358 C186.42462796 243.78139193 177.21875589 242.17839471 168.01321256 240.57345539 C157.71690603 238.77860405 147.41958601 236.98960364 137.12216234 235.2011745 C117.8636624 231.85626409 98.60625744 228.50509072 79.34938359 225.15083301 C78.06927502 224.92785799 78.06927502 224.92785799 76.76330566 224.70037842 C75.9259056 224.55451518 75.08850553 224.40865195 74.2257297 224.25836861 C63.22232397 222.34185212 52.21839005 220.42837389 41.21439743 218.51523018 C36.75667592 217.74019763 32.29899377 216.96493877 27.84130859 216.18969727 C25.56087348 215.79312526 23.28043682 215.39656219 21 215 C18.89652617 209.02315562 17.20160077 203.06884333 15.83374023 196.88452148 C15.63754058 196.01528581 15.44134092 195.14605013 15.23919582 194.25047398 C14.59129665 191.37497578 13.94996536 188.49805429 13.30859375 185.62109375 C12.84629286 183.56387114 12.383565 181.50674443 11.92044067 179.44970703 C10.6778878 173.92516036 9.44102685 168.39935532 8.20573807 162.87318039 C6.14029518 153.63619782 4.06799286 144.40074889 1.99733543 135.16493416 C1.20827392 131.64436587 0.4199619 128.12363027 -0.36833191 124.60289001 C-3.49555385 110.64524444 -6.66133578 96.6970695 -9.86815834 82.75750542 C-11.13544709 77.24326943 -12.39558377 71.72739377 -13.6558485 66.21154881 C-14.63637485 61.92355058 -15.62203371 57.63686427 -16.61941528 53.35275269 C-17.54718303 49.3676143 -18.46188378 45.37969707 -19.36694717 41.38934326 C-19.69512346 39.95350155 -20.0280877 38.51874303 -20.36657333 37.08529663 C-22.63619615 27.46153906 -25.02697686 17.08093058 -21.8125 7.4375 C-15.91102767 -0.49896278 -9.36020962 -1.20571406 0 0 Z"
                    fill="#0869D9"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      {showContactDetails && activeContact && (
        <div className="w-[30%] bg-white border-l border-gray-300">
          <ContactDetails
            contact={activeContact}
            onClose={() => setShowContactDetails(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;