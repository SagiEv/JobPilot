import Sidebar from './Sidebar';
// import Topbar from './Topbar';

const Layout = ({ children, activeTab, setActiveTab, backendStatus }) => {
    return (
        <div className="app">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} backendStatus={backendStatus} />
            <div className="main">
                {/* <Topbar activeTab={activeTab} /> */}
                <div className="content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;