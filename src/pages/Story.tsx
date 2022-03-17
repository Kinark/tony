import { useEffect, useState, useRef, createRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { nanoid } from 'nanoid';
import Xarrow, { useXarrow, Xwrapper } from 'react-xarrows';
import cloneDeep from 'lodash/cloneDeep';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { FiMessageSquare, FiList, FiPlus, FiBox, FiUser, FiHelpCircle } from 'react-icons/fi';

import {
  ID,
  ChatNode,
  Character,
  Chat,
  Workspace,
  DataStructure,
  ChatNodeTypes,
} from '~/types/data';

import FixedButton from '~/components/FixedButton';
import ChatNodeCard from '~/components/ChatNodeCard';
import {
  CHAT_NODE_CONDITION_TYPE,
  CHAT_NODE_ANSWER_TYPE,
  CHAT_NODE_TEXT_TYPE,
} from '~/constants/variables';
import downloadFile from '~/utils/downloadFile';
import {
  initialCharacterData,
  initialChatNodeData,
  initialChatData,
  initialWorkspaceData,
  initialData,
} from '~/constants/initialData';

const IDS_SIZE = 8;

const loadOrSave = (data?: DataStructure): DataStructure => {
  if (typeof window === 'undefined') return initialData;
  if (data) {
    localStorage.setItem('data', JSON.stringify(data));
    return data;
  }
  const storedData = localStorage.getItem('data');
  return !storedData || !JSON.parse(storedData).length ? initialData : JSON.parse(storedData);
};

interface MousePosition {
  x: number;
  y: number;
}

const Story = () => {
  const updateXarrow = useXarrow();
  const [data, setData] = useState<DataStructure>(loadOrSave());

  const [grabbingMode, setGrabbingMode] = useState(false);
  const [isGrabbing, _setIsGrabbing] = useState<MousePosition | null>(null);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<ID | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<ID | null>(null);
  const [selectedChatNodeId, setSelectedChatNodeId] = useState<ID | null>(null);
  const [playNode, setPlayNode] = useState<ID | null>(null);

  const [scale, setScale] = useState(0.9);

  const [isDragging, setIsDragging] = useState(false);
  const [addLinkMode, setAddLinkMode] = useState<ID | false>(false);
  const [hoveredDeleteOption, setHoveredDeleteOption] = useState<ID | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isGrabbingRef = useRef<MousePosition | null>(null);

  const setIsGrabbing = (data: MousePosition | null) => {
    isGrabbingRef.current = data;
    _setIsGrabbing(data);
  };

  const getSelectedWorkspace = (obj: DataStructure): Workspace | null =>
    obj.find((w) => w.id === selectedWorkspaceId) || null;

  const getSelectedChat = (obj: DataStructure): Chat | null =>
    getSelectedWorkspace(obj)?.chats.find((c) => c.id === selectedChatId) || null;

  const getSelectedChatNode = (obj: DataStructure): ChatNode | null =>
    getSelectedChat(obj)?.nodes.find((cn) => cn.id === selectedChatNodeId) || null;

  const selectedWorkspace = getSelectedWorkspace(data);
  const selectedChat = getSelectedChat(data);
  const selectedChatNode = getSelectedChatNode(data);

  const removeLink = (originChatNodeId: ID, link: ID) => {
    if (!selectedChat) return;
    const dataCopy = cloneDeep(data);
    const target = getSelectedChat(dataCopy)?.nodes.find((node) => node.id === originChatNodeId);
    if (!target) return;
    target.goesTo = target.goesTo.filter((i: ID) => i !== link);
    setData(dataCopy);
    setHoveredDeleteOption(null);
  };

  const addLink = (to: ID) => {
    if (to === addLinkMode) return setAddLinkMode(false);
    if (!selectedChat) return;
    const dataCopy = cloneDeep(data);
    getSelectedChat(dataCopy)
      ?.nodes.find(({ id }) => id === addLinkMode)
      ?.goesTo.push(to);
    setData(dataCopy);
    setAddLinkMode(false);
  };

  const addItem = (originChatNodeId: ID, type: ChatNodeTypes = CHAT_NODE_TEXT_TYPE) => {
    const dataCopy = cloneDeep(data);
    const selectedChatCopy = getSelectedChat(dataCopy);
    const originNode = selectedChatCopy?.nodes.find((item) => item.id === originChatNodeId);
    if (!originNode) return;

    const newItem: ChatNode = {
      ...initialChatNodeData(),
      character: originNode.character,
      x: originNode.x,
      y: originNode.y + 180,
    };

    selectedChatCopy?.nodes.push(newItem);
    originNode.goesTo.push(newItem.id);

    setData(dataCopy);
  };

  const moveItem = (id: ID, x: number, y: number) => {
    const dataCopy = cloneDeep(data);
    const originNode = getSelectedChat(dataCopy)?.nodes.find((item) => item.id === id);
    if (!originNode) return;
    originNode.x = x;
    originNode.y = y;
    setData(dataCopy);
  };

  const deleteChatNode = (id: ID) => {
    if (selectedChat?.nodes.length === 1) {
      return alert('You cannot delete the last node of a chat.');
    }
    if (!window.confirm('Are you sure you want to delete this item?') || !selectedChat) return;
    const dataCopy = cloneDeep(data);
    const selectedChatCopy = getSelectedChat(dataCopy);
    if (!selectedChatCopy) return;
    selectedChatCopy.nodes = selectedChatCopy.nodes
      .map((item) => ({ ...item, goesTo: item.goesTo.filter((i: ID) => i !== id) }))
      .filter((item) => item.id !== id);
    setData(dataCopy);
  };

  const onDrag = (id: ID, _e: DraggableEvent, info: DraggableData) => {
    const { x: oldX, y: oldY } = selectedChat!.nodes.find((item) => item.id === id)!;
    if (Math.abs(oldX - info.x) > 1 || Math.abs(oldY - info.y) > 1) {
      setIsDragging(true);
    }
    updateXarrow();
  };

  const onDragEnd = (id: ID, _e: DraggableEvent, info: DraggableData) => {
    moveItem(id, info.x, info.y);
    updateXarrow();
    setTimeout(() => {
      setIsDragging(false);
    }, 0);
  };

  const handleCardClick = (id: ID) => {
    if (addLinkMode) {
      addLink(id);
    } else if (!isDragging) {
      setSelectedChatNodeId(id === selectedChatNodeId ? null : id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;
    if (!selectedChatNode) return;
    const dataCopy = cloneDeep(data);
    const selectedChatNodeCopy = getSelectedChatNode(dataCopy);
    selectedChatNodeCopy!.message = value;
    setData(dataCopy);
  };

  const changeType = (id: ID, type: ChatNodeTypes) => {
    if (!selectedChatNode) return;
    const dataCopy = cloneDeep(data);
    const selectedChatNodeCopy = getSelectedChat(dataCopy)?.nodes.find((node) => node.id === id);
    selectedChatNodeCopy!.type = type;
    setData(dataCopy);
  };

  const unselect = () => {
    setAddLinkMode(false);
    setSelectedChatNodeId(null);
  };

  const deleteChat = (targetId: ID) => {
    if (!targetId || !window.confirm('Are you sure you want to delete this item?')) return;
    if (!selectedWorkspace) return;
    const dataCopy = cloneDeep(data);
    const selectedWorkspaceCopy = getSelectedWorkspace(dataCopy);
    selectedWorkspaceCopy!.chats = selectedWorkspaceCopy!.chats.filter(({ id }) => id !== targetId);
    setData(dataCopy);
  };

  const deleteWorkspace = (targetId: ID) => {
    if (!targetId || !window.confirm('Are you sure you want to delete this item?')) return;
    const dataCopy = cloneDeep(data);
    setData(dataCopy.filter(({ id }) => id !== targetId));
  };

  const deleteChar = (targetId: ID) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    if (!selectedWorkspace) return;
    const dataCopy = cloneDeep(data);
    const selectedWorkspaceCopy = getSelectedWorkspace(dataCopy);
    selectedWorkspaceCopy!.characters = selectedWorkspaceCopy!.characters.filter(
      (char) => char.id !== targetId
    );
    selectedWorkspaceCopy!.chats = selectedWorkspaceCopy!.chats.map((chat) => ({
      ...chat,
      nodes: chat.nodes.map((node) =>
        node.character !== targetId ? node : { ...node, character: null }
      ),
    }));
    setData(dataCopy);
  };

  const addChar = () => {
    if (!selectedWorkspace) return;
    const dataCopy = cloneDeep(data);
    getSelectedWorkspace(dataCopy)!.characters.push(initialCharacterData());
    setData(dataCopy);
  };

  const addChat = () => {
    if (!selectedWorkspace) return;
    const dataCopy = cloneDeep(data);
    getSelectedWorkspace(dataCopy)!.chats.push(initialChatData());
    setData(dataCopy);
  };

  const addWorkspace = () => {
    const dataCopy = cloneDeep(data);
    setData([...dataCopy, initialWorkspaceData()]);
  };

  const changeWorkspaceName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dataCopy = cloneDeep(data);
    console.log(e);
    dataCopy.find((w) => w.id === e.target.name)!.name = e.target.value;
    setData(dataCopy);
  };

  const changeChatName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dataCopy = cloneDeep(data);
    getSelectedWorkspace(dataCopy)!.chats.find((chat) => chat.id === e.target.name)!.name =
      e.target.value;
    setData(dataCopy);
  };

  const changeCharName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dataCopy = cloneDeep(data);
    getSelectedWorkspace(dataCopy)!.characters.find((char) => char.id === e.target.name)!.name =
      e.target.value;
    setData(dataCopy);
  };

  const setCharacter = (targetId: ID, characterId: ID) => {
    const dataCopy = cloneDeep(data);
    const target = getSelectedChat(dataCopy)!.nodes.find((node) => node.id === targetId)!;
    target.character = target.character === characterId ? null : characterId;
    setData(dataCopy);
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isGrabbingRef.current) document.removeEventListener('mousemove', onMouseMove);
      if (!scrollRef.current) return;
      const { scrollTop, scrollLeft } = scrollRef.current;
      const newX = scrollLeft - e.movementX;
      const newY = scrollTop - e.movementY;
      scrollRef.current.scrollTo(newX, newY);
    },
    [scrollRef.current]
  );

  const onSpaceDown = (e: KeyboardEvent) => {
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA' ||
      e.code !== 'Space'
    )
      return;
    e.preventDefault();
    setGrabbingMode(true);
  };

  const onSpaceUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    setGrabbingMode(false);
  };

  const startGrabbing = useCallback(({ screenX, screenY }: React.MouseEvent<HTMLDivElement>) => {
    setIsGrabbing({ x: screenX, y: screenY });
    document.addEventListener('mousemove', onMouseMove);
  }, []);

  const stopGrabbing = () => {
    document.removeEventListener('mousemove', onMouseMove);
    setIsGrabbing(null);
  };

  const zoom = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      console.log(e);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', onSpaceDown);
    document.addEventListener('keyup', onSpaceUp);
    document.addEventListener('wheel', zoom);
    return () => {
      document.removeEventListener('keydown', onSpaceDown);
      document.removeEventListener('keyup', onSpaceUp);
      document.removeEventListener('wheel', zoom);
    };
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.addEventListener('scroll', updateXarrow);
    return () => {
      if (!scrollRef.current) return;
      scrollRef.current.removeEventListener('scroll', updateXarrow);
    };
  }, [scrollRef]);

  useEffect(() => {
    loadOrSave(data);
  }, [data]);

  const exportToJson = (id: ID) => {
    const dataCopy = cloneDeep(data);
    const target = dataCopy.find((x) => x.id === id);
    if (!target) return;
    downloadFile({
      data: JSON.stringify(target),
      fileName: `${target.name}-Chats.json`,
      fileType: 'text/json',
    });
  };

  const play = (id: ID) => {
    const dataCopy = getSelectedChat(cloneDeep(data));
    const target = dataCopy?.nodes.find((x) => x.id === id);
    if (!target || target.type !== CHAT_NODE_TEXT_TYPE) return;
    setPlayNode(id);
  };

  return (
    <>
      {!!playNode && (
        <PlayModeWrapper>
          <div>
            <CharacterPlayModeName>
              {(selectedWorkspace?.characters &&
                selectedWorkspace?.characters.find(
                  (char) =>
                    char.id === selectedChat?.nodes.find((node) => node.id === playNode)?.character
                )?.name) ||
                'No one'}{' '}
              said:
            </CharacterPlayModeName>
            <p>{selectedChat?.nodes.find((node) => node.id === playNode)?.message}</p>
            {selectedChat?.nodes
              .filter((node) =>
                selectedChat?.nodes.find((node) => node.id === playNode)?.goesTo.includes(node.id)
              )
              ?.map((node) => (
                <Button
                  key={node.id}
                  onClick={() =>
                    setPlayNode(node.type === CHAT_NODE_TEXT_TYPE ? node.id : node.goesTo[0])
                  }
                >
                  {node.type === CHAT_NODE_TEXT_TYPE ? 'Next' : node.message}
                </Button>
              ))}
            {selectedChat?.nodes.find((node) => node.id === playNode)?.goesTo.length === 0 && (
              <Button onClick={() => setPlayNode(null)}>Finish</Button>
            )}
          </div>
        </PlayModeWrapper>
      )}
      {/* {grabbingMode && ( */}
      {/* )} */}
      <WorkspacesWrapper>
        {data.map((w) => (
          <FixedButton
            key={w.id}
            icon={<FiBox />}
            data={w.id}
            value={w.name}
            selected={w.id === selectedWorkspaceId}
            onClick={setSelectedWorkspaceId}
            onValueChange={changeWorkspaceName}
            onDownload={exportToJson}
            onDelete={deleteWorkspace}
          />
        ))}
        <FixedButton icon={<FiPlus />} onClick={addWorkspace} add value="New workspace" />
      </WorkspacesWrapper>
      {selectedWorkspace && (
        <ChatsWrapper>
          {selectedWorkspace.chats.map((chat) => (
            <FixedButton
              key={chat.id}
              icon={<FiMessageSquare />}
              data={chat.id}
              value={chat.name}
              selected={chat.id === selectedChatId}
              onClick={setSelectedChatId}
              onValueChange={changeChatName}
              onDelete={deleteChat}
            />
          ))}
          <FixedButton icon={<FiPlus />} onClick={addChat} add value="New chat" />
        </ChatsWrapper>
      )}
      {selectedWorkspace && (
        <CharactersWrapper>
          {selectedWorkspace.characters.map((char) => (
            <FixedButton
              key={char.id}
              icon={<FiUser />}
              data={char.id}
              value={char.name}
              onValueChange={changeCharName}
              onDelete={deleteChar}
            />
          ))}
          <FixedButton icon={<FiPlus />} onClick={addChar} add value="New character" />
        </CharactersWrapper>
      )}
      {selectedChatNode && (
        <SidePanel>
          <SidePanelContent>
            <ItemTitleBar>
              <ItemTitle>
                {selectedChatNode.type === CHAT_NODE_TEXT_TYPE ? <FiMessageSquare /> : <FiList />}
                {selectedChatNode.type}
              </ItemTitle>
              <IdTag>{selectedChatNode.id}</IdTag>
            </ItemTitleBar>
            <TypeChooserWrapper>
              <TypeChooser
                onClick={() => changeType(selectedChatNodeId!, CHAT_NODE_TEXT_TYPE)}
                selected={selectedChatNode.type === CHAT_NODE_TEXT_TYPE}
              >
                <FiMessageSquare />
                <span>Text</span>
              </TypeChooser>
              <TypeChooser
                onClick={() => changeType(selectedChatNodeId!, CHAT_NODE_ANSWER_TYPE)}
                selected={selectedChatNode.type === CHAT_NODE_ANSWER_TYPE}
              >
                <FiList />
                <span>Answer</span>
              </TypeChooser>
              <TypeChooser
                onClick={() => changeType(selectedChatNodeId!, CHAT_NODE_CONDITION_TYPE)}
                selected={selectedChatNode.type === CHAT_NODE_CONDITION_TYPE}
              >
                <FiHelpCircle />
                <span>Condition</span>
              </TypeChooser>
            </TypeChooserWrapper>
            <Textarea
              onChange={handleInputChange}
              name="message"
              value={selectedChatNode.message}
            />
          </SidePanelContent>
          <div>
            {selectedChatNode.type === CHAT_NODE_TEXT_TYPE && (
              <Button onClick={() => play(selectedChatNodeId!)}>Play</Button>
            )}
            <Button red onClick={() => deleteChatNode(selectedChatNodeId!)}>
              Delete
            </Button>
          </div>
        </SidePanel>
      )}
      <ExternalWrapper onClick={unselect} ref={scrollRef}>
        <Grabber
          grabMode={grabbingMode}
          grabbing={!!isGrabbing}
          onMouseDown={startGrabbing}
          onMouseUp={stopGrabbing}
        />
        <Wrapper style={{ transform: `scale(${scale})` }}>
          {selectedWorkspace && selectedChat && selectedChat && (
            <Xwrapper>
              {selectedChat.nodes.map((item, i) => (
                <Draggable
                  defaultPosition={{ x: item.x, y: item.y }}
                  position={{ x: item.x, y: item.y }}
                  scale={1}
                  key={item.id}
                  onDrag={(...rest) => onDrag(item.id, ...rest)}
                  onStop={(...rest) => onDragEnd(item.id, ...rest)}
                  handle=".handler"
                >
                  <CardHandler className="handler">
                    <ChatNodeCard
                      characters={selectedWorkspace.characters}
                      setCharacter={setCharacter}
                      setHoveredDeleteOption={setHoveredDeleteOption}
                      addItem={addItem}
                      isDragging={isDragging}
                      selected={selectedChatNodeId === item.id}
                      fadedOut={
                        (addLinkMode && addLinkMode !== item.id) ||
                        (!!hoveredDeleteOption && hoveredDeleteOption !== item.id)
                      }
                      onCardClick={() => handleCardClick(item.id)}
                      removeLink={removeLink}
                      setAddLinkMode={setAddLinkMode}
                      item={item}
                    />
                  </CardHandler>
                </Draggable>
              ))}
              {selectedChat.nodes.map((item, i) =>
                item.goesTo.map((goingTo) => (
                  <Xarrow
                    SVGcanvasStyle={{ transform: `scale(${scale})` }}
                    dashness
                    headSize={4}
                    zIndex={
                      selectedChatNodeId === item.id || hoveredDeleteOption === goingTo ? 1 : 0
                    }
                    color={
                      selectedChatNodeId === item.id || hoveredDeleteOption === goingTo
                        ? '#0068f6'
                        : '#91b1df'
                    }
                    headShape="circle"
                    key={nanoid()}
                    start={item.id}
                    end={goingTo}
                    curveness={0.8}
                  />
                ))
              )}
            </Xwrapper>
          )}
        </Wrapper>
      </ExternalWrapper>
    </>
  );
};

export default Story;

const PlayModeWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(40px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 24px;
  & > div {
    max-width: 90%;
    width: 400px;
  }
`;

const CharacterPlayModeName = styled.div`
  font-weight: bold;
`;

const Grabber = styled.div<{ grabbing?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: ${({ grabMode }) => (grabMode ? 10 : 0)};
  cursor: ${({ grabbing }) => (grabbing ? 'grabbing' : 'grab')};
`;

const WorkspacesWrapper = styled.div`
  display: flex;
  position: fixed;
  top: 25px;
  left: 25px;
  z-index: 3;
  gap: 8px;
  color: #424242;
`;

const ChatsWrapper = styled(WorkspacesWrapper)`
  top: unset;
  bottom: 25px;
`;

const CharactersWrapper = styled(WorkspacesWrapper)`
  top: 75px;
`;

const Button = styled.button<{ red?: boolean }>`
  display: flex;
  margin-top: 8px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  background: ${({ red }) => (red ? 'red' : '#0068f6')};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  align-self: flex-end;
  &:hover {
    background: ${({ red }) => (red ? '#ff5252' : '#0058d3')};
  }
`;

const TypeChooserWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const TypeChooser = styled.button<{ selected: boolean }>`
  flex: 1;
  display: flex;
  border: none;
  flex-direction: column;
  align-items: center;
  margin: 5px;
  font-size: 16px;
  background: #f3f3f3;
  border-radius: 5px;
  padding: 8px;
  gap: 4px;
  cursor: pointer;
  font-sizs: 14px;
  font-weight: 600;
  color: ${({ selected }) => (selected ? '#0068f6' : 'gray')};
  &:hover {
    background: #e3e3e3;
  }
`;

const CardHandler = styled.div`
  pointer-events: all;
`;

const SidePanelContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
`;

const SidePanel = styled.div`
  position: fixed;
  height: calc(100vh - 50px);
  width: 400px;
  top: 25px;
  right: 25px;
  background: rgba(255, 255, 255, 0.7);
  padding: 25px;
  border-radius: 24px;
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.1);
  border: solid 1px rgba(255, 255, 255, 0.9);
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 16px;
  backdrop-filter: blur(40px);
`;

const Textarea = styled.textarea`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: #f3f3f3;
  padding: 10px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  resize: vertical;
  min-height: 200px;
`;

const ExternalWrapper = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: auto;
  background-color: #fafafa;
`;

const Wrapper = styled.div`
  height: 10000px;
  width: 10000px;
  position: relative;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.11' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E");
`;

const ItemTitleBar = styled.div`
  background: #0068f6;
  padding: 6px 12px;
  border-radius: 8px;
  text-transform: capitalize;
  color: white;
  display: flex;
  justify-content: space-between;
  padding-right: 8px;
  align-items: center;
  width: 100%;
`;

const ItemTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  width: 100%;
`;

const IdTag = styled.div`
  background: white;
  padding: 1px 6px;
  color: #0068f6;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  line-height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
`;

const GoingToPanel = styled.div`
  padding: 10px;
  display: inline-block;
  background: white;
  border-radius: 16px;
  position: absolute;
  width: 125px;
  display: flex;
  top: 155px;
  right: 0;
  margin: 0;
  flex-direction: column;
  gap: 4px;
  z-index: 3;
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.1);
`;