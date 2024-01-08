import React, { createContext, useState, useContext } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [openModal, setOpenModal] = useState(false);
    const [message, setMessage] = useState("");
    const [data, setData] = useState()

    const showModal = (errorMessage, data = null) => {
        setOpenModal(true);
        setMessage(errorMessage);
        setData(data)
    };

    const hideModal = () => {
        setOpenModal(false);
        setMessage("")
        setData()
    };

    return (
        <ModalContext.Provider value={{ openModal, message, data, showModal, hideModal }}>
            {children}
        </ModalContext.Provider>
    );
};